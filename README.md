# PassG — Secure Passwords. Smart Passphrases. Unique Usernames.

PassG is a modern, privacy-first, and cryptographically secure generator tool designed for the security-conscious user. It goes beyond simple random strings to offer a comprehensive suite of identity generation tools: **Quantum-Resistant Passwords**, **Memorable Passphrases**, and **Unique Usernames**.

Built entirely with client-side technologies, PassG ensures that **no data ever leaves your browser**.

---

## 🛡️ Why Trust PassG?

In an era of data breaches, trusting an online tool with your security credentials is hard. Here is why PassG is different:

1.  **100% Client-Side Execution**: All logic runs locally in your browser. There are **no server calls** to generate passwords. You can even disconnect your internet and use it offline.
2.  **Cryptographically Secure**: We do not use `Math.random()`. PassG utilizes the browser's `crypto.getRandomValues()` API, which provides a Cryptographically Secure Pseudo-Random Number Generator (CSPRNG) suitable for security-critical applications.
3.  **Open Source**: The code is transparent. You can verify exactly how your passwords are generated. We encourage security professionals to audit our code.
4.  **No Tracking**: We do not use analytics, cookies, or third-party trackers.

---

## 🚀 Features & The "Why" Behind Them

### 1. Password Generator

_Why it's better:_ Most generators just pick random characters. PassG ensures mathematical complexity.

- **Basic Mode**: Generates standard secure passwords (e.g., `aB3$kL9#`).
  - _Smart Feature_: Automatically excludes "lookalike" characters (like `1`, `l`, `I`, `0`, `O`) to prevent ambiguity when reading passwords.
- **Advanced Mode (Universal)**: Designed for extreme security requirements.
  - _Universal Coverage_: Includes characters from extended Unicode ranges (Latin-1, Greek, Cyrillic, Math symbols).
  - _Guaranteed Complexity_: Algorithms ensure at least one character from every required set (Lower, Upper, Number, Symbol) is present.
  - _Fisher-Yates Shuffle_: Uses the industry-standard shuffling algorithm to ensure unbiased character distribution.

### 2. Passphrase Generator

_Why it's better:_ Based on the [XKCD 936](https://xkcd.com/936/) philosophy—passwords should be easy for humans to remember but hard for computers to guess.

- **EFF Wordlists**: Uses the Electronic Frontier Foundation's large wordlist for high entropy.
- **Entropic Shuffle**: We implemented a custom `entropicShuffle` algorithm that combines Fisher-Yates with prime number offsets. This ensures that even if the underlying random number generator had a bias, the shuffling logic introduces an additional layer of unpredictability.
- **Advanced Options**: Adds capitalization and random number/symbol separators between words (e.g., `Correct4$Horse9#Battery`) to exponentially increase the search space for brute-force attacks.

### 3. Username Generator

_Why it's better:_ Finding a unique username that is safe to use is challenging.

- **Three Modes**:
  - **Random**: Adjective + Noun combinations (e.g., `NeonDragon`).
  - **Professional**: Clean, business-ready formats (e.g., `John.Doe`).
  - **Gamer**: Leetspeak and stylistic prefixes/suffixes (e.g., `xX_Viper_Xx`).
- **OWASP-Compliant Sanitization**: When you provide a keyword, we sanitize it using OWASP (Open Web Application Security Project) best practices to prevent Injection or XSS attacks if the username is used in vulnerable systems.

### 4. Privacy & Usability

- **Private Mode**: A toggle that disables local history storage. When on, nothing is saved to your browser's LocalStorage.
- **Entropy Meter**: Real-time feedback on the mathematical strength of your password (measured in bits of entropy).
- **PWA Support**: Install PassG as a native app on your desktop or mobile. It works offline!

---

## 🛠️ Technical Deep Dive

For the cybersecurity analysts and developers:

- **Entropy Calculation**: We calculate entropy $E = L \times \log_2(R)$, where $L$ is length and $R$ is the pool size. We also apply penalties for repeated characters to give a realistic strength estimate.
- **Sanitization**: User inputs for usernames are stripped of dangerous characters using regex allowlists (`/[^a-z0-9]/g`), ensuring no malicious scripts can be injected.
- **Memory Safety**: We use `const` and block scoping to minimize the lifespan of sensitive variables in memory, though browser garbage collection is ultimately managed by the JS engine.
- **Content Security Policy**: A strict CSP is implemented to prevent XSS attacks and ensure only trusted resources are loaded.

---

## 🤝 Contributing

This project is **Open Source** and belongs to the community. We believe that security tools should be accessible and improvable by everyone.

**How you can help:**

1.  **Fork the Repository**: Create your own version and experiment.
2.  **Request Features**: Have an idea for a new generator mode? Open an issue!
3.  **Report Bugs**: Found a security flaw? Let us know immediately.
4.  **Submit PRs**: Improve the code, add translations, or fix typos.

### Running Locally

```bash
git clone https://github.com/tusharbasak97/passG.git
cd passG
# Open index.html in your browser. No server needed!
```

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Tushar Basak** - Cybersecurity Analyst

- **Portfolio**: [bit.ly/m/DataBasak](https://bit.ly/m/DataBasak)
- **GitHub**: [tusharbasak97](https://github.com/tusharbasak97)

---

_Stay Secure. Generate Responsibly._

- Icons from Font Awesome.
- Fonts from Google Fonts.
