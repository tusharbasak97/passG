# PassG — Strongest Password Generator

A sleek, secure, and user-friendly web app for generating strong, quantum-resistant passwords. Built with modern web technologies, PassG offers both basic and advanced password generation modes, local history storage, and PWA capabilities for offline use.

## Features

- **Quantum-Resistant Passwords**: Generates complex passwords using lowercase, uppercase, numbers, symbols, and global scripts.
- **Basic & Advanced Modes**: Switch between simple and highly secure password generation with customizable constraints.
- **Password Strength Meter**: Real-time entropy calculation to assess password strength.
- **History Management**: Store and manage generated passwords locally with timestamps.
- **Keyboard Shortcuts**: Alt+G to generate, Alt+C to copy for quick access.
- **PWA Ready**: Installable as a progressive web app with offline support.
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices.
- **SEO Optimized**: Includes meta tags, sitemap, and robots.txt for search engine visibility.
- **Bookmark Button**: Easy bookmarking with Ctrl+D shortcut.

## Technologies Used

- **HTML5**: Semantic markup and accessibility features.
- **CSS3**: Responsive design with custom properties, animations, and media queries.
- **JavaScript (ES6+)**: DOM manipulation, password algorithms, and local storage.
- **PWA**: Manifest file and service worker for installability.
- **Fonts**: Inter from Google Fonts and Font Awesome icons.
- **Hosting**: GitHub Pages for deployment.

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge).
- No server required; runs entirely in the browser.

### Running Locally

1. Clone the repository:

   ```bash
   git clone https://github.com/tusharbasak97/passG.git
   cd passG
   ```

2. Open `index.html` in your browser:

   - Double-click the file or use a local server (e.g., via VS Code Live Server extension).

3. The app will load and function offline once cached.

### Deployment

The app is deployed on GitHub Pages. To deploy your own version:

1. Fork the repository.
2. Enable GitHub Pages in the repository settings (under "Pages", select "Deploy from a branch" and choose `main`).
3. Push changes; the site will update automatically.

## Usage

1. **Generate Passwords**: Click "Generate" or press Alt+G. Adjust length with the slider.
2. **Advanced Mode**: Toggle for unique character constraints and longer ranges.
3. **Copy Password**: Click the copy button or press Alt+C.
4. **View History**: Scroll through past generations in the history section.
5. **Clear History**: Use the "Clear History" button to reset.
6. **Bookmark**: Click the bookmark icon or press Ctrl+D.

## Project Structure

```
passG/
├── index.html          # Main HTML file
├── styles.css          # Stylesheet
├── script.js           # JavaScript logic
├── assets/             # Static assets
│   ├── apple-touch-icon.png
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── site.webmanifest # PWA manifest
│   └── logo.png        # (If applicable)
├── robots.txt          # SEO crawler instructions
├── sitemap.xml         # SEO sitemap
└── README.md           # This file
```

## Contributing

Contributions are welcome! Please fork the repo and submit a pull request. For major changes, open an issue first to discuss.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Tushar Basak** - Cybersecurity Analyst

- Portfolio: [bit.ly/m/DataBasak](https://bit.ly/m/DataBasak)
- GitHub: [tusharbasak97](https://github.com/tusharbasak97)

## Acknowledgments

- Inspired by the need for stronger online security.
- Icons from Font Awesome.
- Fonts from Google Fonts.
