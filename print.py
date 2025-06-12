import sys, os
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QPushButton,
    QTextEdit, QHBoxLayout
)
from PyQt6.QtCore import Qt

class ProjectExplorerApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Project Explorer")
        self.setGeometry(200, 200, 800, 600)

        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        self.tree_display = QTextEdit(readOnly=True)
        self.content_display = QTextEdit(readOnly=True)

        # Buttons
        self.copy_tree_button = QPushButton("Copy Project Tree")
        self.copy_tree_button.clicked.connect(self.copy_tree_text)

        self.copy_content_button = QPushButton("Copy File Contents")
        self.copy_content_button.clicked.connect(self.copy_content_text)

        self.refresh_button = QPushButton("Refresh")
        self.refresh_button.clicked.connect(self.refresh_display)

        button_layout = QHBoxLayout()
        button_layout.addWidget(self.copy_tree_button)
        button_layout.addWidget(self.copy_content_button)
        button_layout.addWidget(self.refresh_button)

        main_layout = QVBoxLayout()
        main_layout.addWidget(self.tree_display)
        main_layout.addLayout(button_layout)
        main_layout.addWidget(self.content_display)

        central_widget.setLayout(main_layout)

        self.directory_path = "/Users/zandipie/Desktop/Work/VibeOps/site-v2/vibeops-testing/construction-tracker"

        # Essential-only file paths
        self.included_paths = [
            "index.html", "package.json", "vite.config.ts", "capacitor.config.ts",
            "src/App.tsx", "src/main.tsx", "src/pages/ConstructionTracker.tsx",
            "src/components/ExploreContainer.tsx", "src/theme/variables.css",
            "public/manifest.json", "public/favicon.png",
            "dist/index.html", "dist/assets",
            "ios/App/AppDelegate.swift"
        ]

        self.display_project_tree()
        self.display_file_contents()

    def display_project_tree(self, depth=2):
        self.tree_display.clear()
        output = []
        self._print_tree(self.directory_path, depth, output)
        self.tree_display.setPlainText("\n".join(output))

    def _print_tree(self, directory, depth, output, indent=""):
        if depth < 0: return
        try:
            entries = sorted(os.listdir(directory))
        except PermissionError:
            output.append(indent + "Permission denied.")
            return

        for entry in entries:
            path = os.path.join(directory, entry)
            if os.path.isdir(path):
                output.append(indent + f"📁 {entry}/")
                self._print_tree(path, depth - 1, output, indent + "  ")
            else:
                output.append(indent + f"📄 {entry}")

    def display_file_contents(self):
        self.content_display.clear()
        output = []
        for relative_path in self.included_paths:
            full_path = os.path.join(self.directory_path, relative_path)
            output.append(f"\n--- {relative_path} ---")
            try:
                if os.path.isdir(full_path):
                    output.append("[directory]")
                else:
                    with open(full_path, "r") as file:
                        output.append(file.read())
            except Exception as e:
                output.append(f"Error: {e}")
        self.content_display.setPlainText("\n".join(output))

    def copy_tree_text(self):
        QApplication.clipboard().setText(self.tree_display.toPlainText())

    def copy_content_text(self):
        QApplication.clipboard().setText(self.content_display.toPlainText())

    def refresh_display(self):
        self.display_project_tree()
        self.display_file_contents()

def main():
    app = QApplication(sys.argv)
    win = ProjectExplorerApp()
    win.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
