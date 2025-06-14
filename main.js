#!/usr/bin/env gjs

imports.gi.versions.Gtk = "4.0";
imports.gi.versions.Gio = "2.0";

const { Gtk, Gio } = imports.gi;

// Create application
const app = new Gtk.Application({
    application_id: "com.example.TodoApp",
    flags: Gio.ApplicationFlags.FLAGS_NONE,
});

app.connect("activate", () => {
    const win = new Gtk.ApplicationWindow({
        application: app,
        title: "Todo App",
        default_width: 400,
        default_height: 500,
    });

    const vbox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 10,
        margin_top: 15,
        margin_bottom: 15,
        margin_start: 15,
        margin_end: 15,
    });

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

    // Scrollable list
    const scrolledWindow = new Gtk.ScrolledWindow({
        vexpand: true,
    });

    const taskList = new Gtk.ListBox({
        selection_mode: Gtk.SelectionMode.NONE,
    });

    scrolledWindow.set_child(taskList);

    // Append input & task list
    vbox.append(inputBox);
    vbox.append(scrolledWindow);
    win.set_child(vbox);

    // Function to create a task row wrapped in ListBoxRow
    const addTask = (taskText) => {
        const text = taskText.trim();
        if (text === "") return;

        // Create a ListBoxRow
        const row = new Gtk.ListBoxRow();

        // Inside it, put a horizontal Box
        const hbox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
            margin_top: 4,
            margin_bottom: 4,
            margin_start: 4,
            margin_end: 4,
        });

        // Check button for completion toggle
        const checkButton = new Gtk.CheckButton({ label: text });
        checkButton.hexpand = true;

        // Delete button
        const deleteButton = new Gtk.Button({ label: "🗑" });
        deleteButton.connect("clicked", () => {
            // Remove the row (direct child) from the ListBox
            taskList.remove(row);
            // Alternatively: row.destroy();
        });

        hbox.append(checkButton);
        hbox.append(deleteButton);

        // Set the box as child of the ListBoxRow
        row.set_child(hbox);

        // Append the ListBoxRow to the ListBox
        taskList.append(row);
        taskList.show_all();
    };

    // Button click adds task
    addButton.connect("clicked", () => {
        addTask(entry.text);
        entry.text = "";
        entry.grab_focus();
    });

    // Pressing Enter also adds task
    entry.connect("activate", () => {
        addTask(entry.text);
        entry.text = "";
    });

    win.present();
});

app.run([]);
