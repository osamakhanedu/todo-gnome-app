#!/usr/bin/env gjs

/**
 * Todo App with per-item Pomodoro timer using a circular clock visualization.
 *
 * Each task row has:
 *  - A CheckButton for marking done.
 *  - A circular timer widget (DrawingArea) showing remaining time as arc + MM:SS text.
 *  - A Start/Pause button.
 *  - A Reset button.
 *  - A Delete button.
 *
 * Uses GLib.timeout_add_seconds for 1-second updates, and redraws the DrawingArea each tick.
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

// Helper: extract a color from the style context for drawing, so we adapt to theme
function getColorRGBA(styleContext, stateFlags = Gtk.StateFlags.NORMAL) {
    // In GTK4, use styleContext.get_color() or get_property?
    // Actually: styleContext.get_color() is deprecated; instead use styleContext.lookup_color?
    // We can fetch a CSS color name if we know one, but for simplicity, fetch from "color" CSS property:
    // styleContext.get_color() returns Gdk.RGBA
    try {
        let color = styleContext.get_color(stateFlags);
        return color; // Gdk.RGBA
    } catch (e) {
        // Fallback to a default (black)
        let c = new Gdk.RGBA();
        c.parse("black");
        return c;
    }
}

// Create application
const app = new Gtk.Application({
    application_id: "com.example.TodoPomodoroAppCircular",
    flags: Gio.ApplicationFlags.FLAGS_NONE,
});

app.connect("activate", () => {
    const win = new Gtk.ApplicationWindow({
        application: app,
        title: "Todo App with Circular Pomodoro Timers",
        default_width: 600,
        default_height: 600,
    });

    // Main vertical box
    const vbox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 10,
        margin_top: 15,
        margin_bottom: 15,
        margin_start: 15,
        margin_end: 15,
    });

    // Entry and Add button
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

    // Scrollable ListBox for tasks
    const scrolledWindow = new Gtk.ScrolledWindow({
        vexpand: true,
    });

    const taskList = new Gtk.ListBox({
        selection_mode: Gtk.SelectionMode.NONE,
    });
    scrolledWindow.set_child(taskList);

    // Pack input and list into main vbox
    vbox.append(inputBox);
    vbox.append(scrolledWindow);
    win.set_child(vbox);

    // Function to add a task row with circular timer controls
    function addTask(taskText) {
        const text = taskText.trim();
        if (text === "") return;

        // Create a ListBoxRow
        const row = new Gtk.ListBoxRow();

        // Horizontal box inside the row
        const hbox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
            margin_top: 4,
            margin_bottom: 4,
            margin_start: 4,
            margin_end: 4,
        });

        // 1. CheckButton for marking completion
        const checkButton = new Gtk.CheckButton({ label: text });
        checkButton.hexpand = true;

        // 2. Circular timer widget: DrawingArea
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
            // Use style context to fetch theme colors
            const styleContext = area.get_style_context();
            // Base color for arc/text
            let color = getColorRGBA(styleContext);
            // Background circle color: translucent version
            let bgColor = new Gdk.RGBA();
            bgColor.red = color.red;
            bgColor.green = color.green;
            bgColor.blue = color.blue;
            bgColor.alpha = 0.2; // translucent background

            // Convert Gdk.RGBA to cairo source
            cr.setSourceRGBA(bgColor.red, bgColor.green, bgColor.blue, bgColor.alpha);
            let radius = Math.min(width, height) / 2 - 2; // slight padding
            let cx = width / 2;
            let cy = height / 2;
            // Draw background circle
            cr.arc(cx, cy, radius, 0, 2 * Math.PI);
            cr.fill();

            // Foreground arc: show elapsed portion
            let fraction = (POMODORO_DURATION - remaining) / POMODORO_DURATION;
            // If remaining <= 0, full circle
            let endAngle = -Math.PI / 2 + fraction * 2 * Math.PI;
            // Only draw if remaining > 0
            if (remaining > 0) {
                cr.setSourceRGBA(color.red, color.green, color.blue, 1.0);
                cr.setLineWidth(4);
                // Draw arc from top (-π/2) to endAngle
                cr.arc(cx, cy, radius, -Math.PI / 2, endAngle);
                cr.stroke();
            } else {
                // Optionally, draw a full circle in a different color or flash; here draw full arc
                cr.setSourceRGBA(color.red, color.green, color.blue, 1.0);
                cr.setLineWidth(4);
                cr.arc(cx, cy, radius, 0, 2 * Math.PI);
                cr.stroke();
            }

            // Draw the time text centered
            const layout = PangoCairo.create_layout(cr);
            layout.set_text(formatTime(remaining), -1);
            // Choose a font size relative to area
            const fontDesc = Pango.FontDescription.from_string("10"); // adjust if needed
            layout.set_font_description(fontDesc);
            // Get text size
            let [textWidth, textHeight] = layout.get_size();
            // Pango returns sizes in Pango units (1/ PANGO_SCALE)
            textWidth = textWidth / Pango.SCALE;
            textHeight = textHeight / Pango.SCALE;
            // Position to center
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
                    // Already finished: do nothing or require reset first
                    return;
                }
                // Start countdown
                running = true;
                startPauseButton.label = "Pause";
                // Tick every second
                timeoutId = GLib.timeout_add_seconds(
                    GLib.PRIORITY_DEFAULT,
                    1,
                    () => {
                        remaining--;
                        // Redraw the circular timer
                        drawingArea.queue_draw();

                        if (remaining <= 0) {
                            // Time's up
                            running = false;
                            startPauseButton.label = "Start";
                            if (timeoutId) {
                                GLib.source_remove(timeoutId);
                                timeoutId = 0;
                            }
                            // Notify: here just print; you can show a dialog or notification
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
            taskList.remove(row);
        });

        // Pack widgets into hbox:
        // [ CheckButton | DrawingArea | Start/Pause | Reset | Delete ]
        hbox.append(checkButton);
        hbox.append(drawingArea);
        hbox.append(startPauseButton);
        hbox.append(resetButton);
        hbox.append(deleteButton);

        row.set_child(hbox);
        taskList.append(row);
        taskList.show_all();
    }

    // Connect Add button
    addButton.connect("clicked", () => {
        addTask(entry.text);
        entry.text = "";
        entry.grab_focus();
    });
    entry.connect("activate", () => {
        addTask(entry.text);
        entry.text = "";
    });

    win.present();
});

app.run([]);
