# Todo App with Pomodoro Timers (GJS + GTK4)

A simple Todo application built with GNOME JavaScript (GJS) and GTK4, featuring per-task Pomodoro-style timers and a stack-based UI to switch between active and completed tasks.

## Features

- **Add Tasks**: Input new todo items through an entry field.
- **Active & Completed Views**: Switch between "Todos" (active tasks) and "Completed" via a top-bar `Gtk.StackSwitcher`.
- **Per-Task Pomodoro Timer**:

  - Circular timer visualization using `Gtk.DrawingArea` and Cairo.
  - Default 25-minute countdown.
  - Start/Pause, Reset controls per task.
  - Automatic stop and visual update when time elapses.

- **Complete/Un-complete**:

  - `Gtk.CheckButton` toggles completion state.
  - Moving tasks between active and completed lists disables/enables timer controls.

- **Delete Tasks**: Remove tasks (and stop timers if running) with a delete button.
- **Theme-Adaptive UI**: Timer arc and text colors adapt to light/dark themes via style context.
- **Scrollable Lists**: Both active and completed lists scroll independently.

## Prerequisites

- **GNOME JavaScript (GJS)**: Ensure `gjs` is installed.
- **GTK4 development files**: For runtime, ensure GTK4 libraries are present.
- **GLib/GIO**: Available by default on GNOME-based systems.
- **Ubuntu 24.04 or similar Linux**: Tested on Ubuntu 24.04.

```bash
sudo apt update
sudo apt install gjs libgtk-4-dev
dpkg -l | grep gjs
```

Ensure that `gjs` and GTK4 are properly installed before running the app.

## Installation

1. **Clone or copy** the repository or script:

   ```bash
   git clone <your-repo-url>
   cd <repo-directory>
   ```

   Or simply place `main.js` in a folder.

2. **Make executable**:

   ```bash
   chmod +x main.js
   ```

3. (Optional) **Add a `.desktop` file** if you want to integrate into GNOME menu:

   - Create a file `com.example.TodoPomodoroApp.desktop` in `~/.local/share/applications/` with content:

     ```ini
     [Desktop Entry]
     Name=Todo Pomodoro App
     Comment=Todo list with Pomodoro timers
     Exec=/path/to/main.js
     Icon=utilities-terminal
     Terminal=false
     Type=Application
     Categories=Utility;
     ```

   - Adjust `Exec=` path to the absolute path of `main.js`. Choose an appropriate icon or leave default.

## Usage

1. **Run the app**:

   ```bash
   ./main.js
   ```

2. **Add a Task**:

   - In the "Todos" view (default), type a task in the entry field and press **Enter** or click **➕ Add Task**.

3. **Start Pomodoro Timer**:

   - For an active task, click **Start** next to its circular clock. The arc and time text update each second.
   - Click **Pause** to pause; **Start** to resume.
   - Click **Reset** to reset to 25:00.

4. **Complete a Task**:

   - Click the checkbox next to the task label. This stops and resets the timer, disables Start/Reset buttons, and moves the task to the "Completed" view.
   - To view completed tasks, click **Completed** in the top StackSwitcher.
   - Uncheck a completed task to move it back to "Todos" (timer resets and controls re-enable).

5. **Delete a Task**:

   - Click the 🗑 button next to a task (in either view). This stops any running timer and removes the task.

6. **Switching Views**:

   - Use the top-bar buttons: **Todos** and **Completed** to toggle between active and completed lists.

## Customization

- **Pomodoro Duration**:

  - Default duration is 25 minutes (`25 * 60` in seconds). To change, modify `POMODORO_DURATION` in `main.js`.

- **Clock Size & Font**:

  - Adjust `CLOCK_SIZE` (pixel width/height) in `main.js` for larger/smaller circles.
  - In the drawing function, modify Pango font description (e.g., `"12"`) for readability.

- **Styling Completed Tasks**:

  - Apply CSS classes via `Gtk.CssProvider` to dim or strikethrough labels in completed view. For example:

    ```js
    checkButton.get_style_context().add_class("completed-task");
    ```

  - In code, when toggling completion, add/remove a CSS class on the row or label; load a CSS provider at startup.

- **Notifications**:

  - On timer completion, you can show a `Gtk.MessageDialog` or use `Gio.Application.send_notification` (requires proper application registration and desktop file).

- **Persistent Storage**:

  - Save tasks (and optionally paused timer states) to a file on disk (e.g., JSON) on app exit, and reload on startup using `GLib.File` or standard JS file I/O in GJS.

- **Break Cycles**:

  - Extend timer logic to auto-start a short break after work interval, track cycles per task or globally. Requires a state machine per task.

- **Flatpak Packaging**:

  - Create a Flatpak manifest to sandbox and distribute via Flathub. Use `org.gnome.Sdk` runtime and install GJS if needed.

## Troubleshooting

- **`Error: Tried to construct an object without a GType`**:

  - Ensure you are not subclassing `Gtk.Application` in GJS. The provided code instantiates `Gtk.Application` and connects signals appropriately.

- **GTK Version Ambiguity**:

  - If warnings about requiring Gtk but multiple versions exist, ensure GJS picks GTK4 by adding:

    ```js
    imports.gi.versions.Gtk = "4.0";
    ```

    before importing.

- **Permissions**:

  - If `./main.js` fails with permission denied, verify `chmod +x main.js`.

- **Theme Colors**:

  - If timer arc/text is not visible in a particular theme, adjust color extraction or define explicit colors in drawing code.

## Development & Contribution

- Feel free to fork and extend. Key areas:

  - Implement persistence
  - Add customizable durations per task
  - Enhance UI/UX with CSS
  - Integrate notifications
  - Internationalization (i18n) using gettext in GJS

- For bug reports or feature requests, open an issue in the repository.

## License

Specify your preferred license, e.g., MIT License:

```
MIT License

Copyright (c) YYYY Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

... (rest of MIT license) ...
```

Alternatively, choose GPL, Apache, etc., as appropriate.

## Acknowledgments

- Built with **GJS** and **GTK4**.
- Inspiration from GNOME development tutorials and examples.

---

Enjoy building and customizing your Todo Pomodoro App with GJS & GTK4!
