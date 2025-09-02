# Change Log

All notable changes to this project will be documented in this file.

## 1.1.2 (2025-08-30)

### 🐛 Bug Fixes

* Fixed a bug where uncommitted files were not marked as "closed" when the file actually closed.

### 🧪 Tests

* Added more unit test coverage.

## 1.1.1 (2025-08-29)

### 📚 Documentation

* Improved the README and CHANGELOG.

## 1.1.0 (2025-08-28)

### ✨ Features

* Added an Output Channel (View → Output → Better Regions) with timestamped logs.
* Grouped logs by file with a header (--- file ---) when a file becomes active.
* Recorded events: file opened/closed, cursor and selection positions, total line count, number of marker regions, action type (close all vs. keep caret region open), how many regions are closed vs. kept, and errors.

## 1.0.0 (2025-08-27)

* Initial release.

