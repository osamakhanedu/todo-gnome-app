#!/usr/bin/env gjs

/**
 * Todo App with per-item Pomodoro timer (circular clock) and two views:
 *  “Todos” and “Completed”, switchable via a StackSwitcher at the top.
 *
 * In the “Todos” view:
 *   - Input row (Entry + Add button)
 *   - List of active tasks
 * In the “Completed” view:
 *   - List of completed tasks
 *
 * Checking a task moves it to Completed; unchecking moves it back to Todos.
 * Each task has a circular Pomodoro timer (25 min), Start/Pause, Reset, and Delete.
 *
 * Usage:
 *   chmod +x main.js
 *   ./main.js
 */

imports.gi.versions.Gtk = "4.0";
imports.gi.versions.Gio = "2.0";
imports.gi.versions.GLib = "2.0";

const { Gtk, Gio, GLib, Gdk } = imports.gi;
const Pango = imports.gi.Pango;
const PangoCairo = imports.gi.PangoCairo;

// Format seconds into "MM:SS"
function formatTime(seconds) {
    let m = Math.floor(seconds / 60);
    let s = seconds % 60;
    let mm = String(m).padStart(2, '0');
    let ss = String(s).padStart(2, '0');
    return `${mm}:${ss}`;
}

const POMODORO_DURATION = 25 * 60; // 25 minutes
const CLOCK_SIZE = 50; // pixel width/height of the circular timer

// Helper: get a color from style context, adapting to theme
function getColorRGBA(styleContext, stateFlags = Gtk.StateFlags.NORMAL) {
    try {
        let color = styleContext.get_color(stateFlags);
        return color; // Gdk.RGBA
    } catch (e) {
        // Fallback to black
        let c = new Gdk.RGBA();
        c.parse("black");
        return c;
    }
}

const app = new Gtk.Application({
    application_id: "com.example.TodoPomodoroAppStackViews",
    flags: Gio.ApplicationFlags.FLAGS_NONE,
});

app.connect("activate", () => {
    // Main window
    const win = new Gtk.ApplicationWindow({
        application: app,
        title: "Todo App with Pomodoro & Views",
        default_width: 600,
        default_height: 700,
    });

    // Main vertical container
    const mainVBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 10,
        margin_top: 15,
        margin_bottom: 15,
        margin_start: 15,
        margin_end: 15,
    });

    // === Create Stack and StackSwitcher for two views ===
    const stack = new Gtk.Stack({
        transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT,
        transition_duration: 200,
    });
    const stackSwitcher = new Gtk.StackSwitcher({
        stack: stack,
    });
    // Style the StackSwitcher if desired; by default it shows buttons with titles of pages.

    // Pack the StackSwitcher at top
    mainVBox.append(stackSwitcher);

    // === Create Active (“Todos”) view ===
    const todosBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 10,
    });

    // Input row: Entry + Add button
    const entry = new Gtk.Entry({
        placeholder_text: "Add a new task...",
        hexpand: true,
    });
    const addButton = new Gtk.Button({ label: "➕ Add Task" });
    const inputBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 8,
    });
    inputBox.append(entry);
    inputBox.append(addButton);
    todosBox.append(inputBox);

    // Scrollable active list
    const activeScrolled = new Gtk.ScrolledWindow({
        vexpand: true,
    });
    const activeList = new Gtk.ListBox({
        selection_mode: Gtk.SelectionMode.NONE,
    });
    activeScrolled.set_child(activeList);
    todosBox.append(activeScrolled);

    // === Create Completed view ===
    const completedBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 10,
    });
    // Scrollable completed list
    const completedScrolled = new Gtk.ScrolledWindow({
        vexpand: true,
    });
    const completedList = new Gtk.ListBox({
        selection_mode: Gtk.SelectionMode.NONE,
    });
    completedScrolled.set_child(completedList);
    completedBox.append(completedScrolled);

    // Add pages to stack: the first argument is the child widget,
    // second is the name (id), third is the visible title on StackSwitcher.
    stack.add_titled(todosBox, "todos", "Todos");
    stack.add_titled(completedBox, "completed", "Completed");

    // Finally, pack stack into mainVBox
    mainVBox.append(stack);

    win.set_child(mainVBox);

    // === Function to add a task row into Active list ===
    function addTask(taskText) {
        const text = taskText.trim();
        if (text === "") return;

        // Create ListBoxRow
        const row = new Gtk.ListBoxRow();

        // Horizontal container in row
        const hbox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
            margin_top: 4,
            margin_bottom: 4,
            margin_start: 4,
            margin_end: 4,
        });

        // 1. CheckButton
        const checkButton = new Gtk.CheckButton({ label: text });
        checkButton.hexpand = true;

        // 2. Circular timer widget
        const drawingArea = new Gtk.DrawingArea({
            width_request: CLOCK_SIZE,
            height_request: CLOCK_SIZE,
        });

        // Timer state (closure per row)
        let remaining = POMODORO_DURATION;
        let timeoutId = 0;
        let running = false;

        // Draw function for the circular timer
        drawingArea.set_draw_func((area, cr, width, height) => {
            const styleContext = area.get_style_context();
            let color = getColorRGBA(styleContext);
            // Background circle color (translucent)
            let bgColor = new Gdk.RGBA();
            bgColor.red = color.red;
            bgColor.green = color.green;
            bgColor.blue = color.blue;
            bgColor.alpha = 0.2;

            cr.setSourceRGBA(bgColor.red, bgColor.green, bgColor.blue, bgColor.alpha);
            let radius = Math.min(width, height) / 2 - 2;
            let cx = width / 2;
            let cy = height / 2;
            // Background circle
            cr.arc(cx, cy, radius, 0, 2 * Math.PI);
            cr.fill();

            // Foreground arc
            let fraction = (POMODORO_DURATION - remaining) / POMODORO_DURATION;
            if (remaining > 0) {
                let endAngle = -Math.PI / 2 + fraction * 2 * Math.PI;
                cr.setSourceRGBA(color.red, color.green, color.blue, 1.0);
                cr.setLineWidth(4);
                cr.arc(cx, cy, radius, -Math.PI / 2, endAngle);
                cr.stroke();
            } else {
                // Completed circle
                cr.setSourceRGBA(color.red, color.green, color.blue, 1.0);
                cr.setLineWidth(4);
                cr.arc(cx, cy, radius, 0, 2 * Math.PI);
                cr.stroke();
            }

            // Time text centered
            const layout = PangoCairo.create_layout(cr);
            layout.set_text(formatTime(remaining), -1);
            const fontDesc = Pango.FontDescription.from_string("10");
            layout.set_font_description(fontDesc);
            let [textWidth, textHeight] = layout.get_size();
            textWidth = textWidth / Pango.SCALE;
            textHeight = textHeight / Pango.SCALE;
            let tx = cx - textWidth / 2;
            let ty = cy - textHeight / 2;
            cr.setSourceRGBA(color.red, color.green, color.blue, 1.0);
            cr.moveTo(tx, ty);
            PangoCairo.show_layout(cr, layout);
        });

        // 3. Start/Pause button
        const startPauseButton = new Gtk.Button({ label: "Start" });
        startPauseButton.connect("clicked", () => {
            if (!running) {
                if (remaining <= 0) {
                    return;
                }
                running = true;
                startPauseButton.label = "Pause";
                timeoutId = GLib.timeout_add_seconds(
                    GLib.PRIORITY_DEFAULT,
                    1,
                    () => {
                        remaining--;
                        drawingArea.queue_draw();
                        if (remaining <= 0) {
                            running = false;
                            startPauseButton.label = "Start";
                            if (timeoutId) {
                                GLib.source_remove(timeoutId);
                                timeoutId = 0;
                            }
                            print(`Pomodoro for "${text}" completed!`);
                            return GLib.SOURCE_REMOVE;
                        }
                        return GLib.SOURCE_CONTINUE;
                    }
                );
            } else {
                // Pause
                running = false;
                startPauseButton.label = "Start";
                if (timeoutId) {
                    GLib.source_remove(timeoutId);
                    timeoutId = 0;
                }
            }
        });

        // 4. Reset button
        const resetButton = new Gtk.Button({ label: "Reset" });
        resetButton.connect("clicked", () => {
            if (running && timeoutId) {
                GLib.source_remove(timeoutId);
                timeoutId = 0;
                running = false;
            }
            remaining = POMODORO_DURATION;
            drawingArea.queue_draw();
            startPauseButton.label = "Start";
        });

        // 5. Delete button
        const deleteButton = new Gtk.Button({ label: "🗑" });
        deleteButton.connect("clicked", () => {
            if (running && timeoutId) {
                GLib.source_remove(timeoutId);
                timeoutId = 0;
                running = false;
            }
            // Remove from whichever list it's in
            let parent = row.get_parent();
            if (parent === activeList) {
                activeList.remove(row);
            } else if (parent === completedList) {
                completedList.remove(row);
            } else {
                row.destroy();
            }
        });

        // Checkbox toggled: move between Todos (activeList) and Completed (completedList)
        checkButton.connect("toggled", () => {
            let isChecked = checkButton.get_active();
            // Stop & reset timer if running
            if (running && timeoutId) {
                GLib.source_remove(timeoutId);
                timeoutId = 0;
                running = false;
            }
            remaining = POMODORO_DURATION;
            drawingArea.queue_draw();
            startPauseButton.label = "Start";

            if (isChecked) {
                // Move to Completed view
                startPauseButton.set_sensitive(false);
                resetButton.set_sensitive(false);
                activeList.remove(row);
                completedList.append(row);
                completedList.show_all();
            } else {
                // Move back to Todos view
                startPauseButton.set_sensitive(true);
                resetButton.set_sensitive(true);
                completedList.remove(row);
                activeList.append(row);
                activeList.show_all();
            }
        });

        // Pack into hbox: [CheckButton | DrawingArea | Start/Pause | Reset | Delete]
        hbox.append(checkButton);
        hbox.append(drawingArea);
        hbox.append(startPauseButton);
        hbox.append(resetButton);
        hbox.append(deleteButton);

        row.set_child(hbox);

        // Initially append to activeList
        activeList.append(row);
        activeList.show_all();
    }

    // Connect Add button and Enter key in entry
    addButton.connect("clicked", () => {
        addTask(entry.text);
        entry.text = "";
        entry.grab_focus();
    });
    entry.connect("activate", () => {
        addTask(entry.text);
        entry.text = "";
    });

    // Show the window
    win.present();
});

app.run([]);
