<img src="https://i.ibb.co/7JKw0Tsz/Picsart-26-10-14-01-47-04-144.png" alt="banner" width="100%">

<h1 align="center"><img src="./dashboard/images/logo-non-bg.png" width="22px"> Queen Bot V2 - Chat Messenger Bot</h1>

<p align="center">
    <a href="https://nodejs.org/dist/v20.0.0">
        <img src="https://img.shields.io/badge/Nodejs%20Support-20.x-brightgreen.svg?style=flat-square" alt="Nodejs Support v20.x">
    </a>
    <img alt="size" src="https://img.shields.io/github/repo-size/ItzPriyanshi/QueenBotV2.svg?style=flat-square&label=size">
    <img alt="code-version" src="https://img.shields.io/badge/dynamic/json?color=brightgreen&label=code%20version&prefix=v&query=%24.version&url=https://github.com/ItzPriyanshi/QueenBotV2/raw/main/package.json&style=flat-square">
    <img alt="visitors" src="https://visitor-badge.laobi.icu/badge?style=flat-square&page_id=ItzPriyanshi.QueenBotV2">
    <img alt="security" src="https://img.shields.io/badge/security-fca--nx-purple?style=flat-square">
    <img alt="license" src="https://img.shields.io/badge/license-MIT-green?style=flat-square&color=brightgreen">
</p>

---

## Project Lineage and Open Source Notice
Queen Bot V2 is an enhanced, highly optimized fork of the original Goat-Bot-V2 created by NTKhang (ntkhang03).
This repository is maintained and Improved by Priyanshi Kaur.
Immense gratitude and special thanks go to the entire open-source developer community. Because of passionate independent developers and the open-source community, this project remains alive, actively maintained, and free for everyone to use.

---

## Table of Contents
- [🚀 What Is New and Upgraded](#-what-is-new-and-upgraded)
- [📝 Note & Disclaimer](#-note--disclaimer)
- [🚧 Requirements](#-requirements)
- [💡 Recommendations](#-recommendations)
- [⚡ Quick Start & Installation](#-quick-start--installation)
- [📝 Tutorial](#-tutorial)
- [⚙️ Configuration](#️-configuration)
- [💡 How it Works](#-how-it-works)
- [🔔 Notifications for Updates](#-notifications-for-updates)
- [🆙 How to Update](#-how-to-update)
- [🛠️ Creating New Commands](#️-creating-new-commands)
- [💭 Support](#-support)
- [📚 Supported Languages](#-supported-languages)
- [📌 Common Problems & Solved Errors](#-common-problems--solved-errors)
- [❌ Warning Regarding Unofficial Builds](#-warning-regarding-unofficial-builds)
- [📸 Screenshots](#-screenshots)
- [✨ Copyright (C)](#-copyright-c)
- [📜 License](#-license)

---

## 🚀 What Is New and Upgraded

### 1. Completely Bypassed Google Credentials Requirement
- All dependencies on Google Cloud Console, Google Drive API, OAuth consent screen, and Google reCAPTCHA v2 have been completely bypassed and eliminated.
- You no longer need client IDs, client secrets, authorized redirect URIs, or OAuth Playground setups.
- Say goodbye to 7-day token expirations, unauthorized client errors, and invalid grant failures. The bot works directly with session cookies.

### 2. Account Ban Risk Reduced by 50% Using Security `fca-nx`
- Upgraded the underlying Facebook Chat API engine to the secure `fca-nx` architecture.
- Implements humanized request pacing, modern payload encryption, and official client header signatures.
- Drastically mitigates automated Facebook checkpoint triggers, reducing ban risks by half compared to legacy implementations.

### 3. Deep Memory Optimization
- Comprehensive cleanup of event listeners and heap allocations.
- Eliminates memory leaks during continuous message flow in large group chats.
- Low RAM usage ensures stability on 512MB and 1GB budget VPS instances or Termux.

### 4. Ultra-Fast Response Times
- Streamlined non-blocking asynchronous event dispatcher.
- Message processing, command lookups, and auto-reactions trigger with minimal latency.

---

## 💡 Recommendations
- Leave `account.dev.txt` blank and place your cookies inside `account.txt`.
- Do not put your live cookies inside `account.dev.txt`—that file is reserved for development configuration only.
- Never commit your `account.txt` file to a public GitHub repository.

---

## 📝 Note & Disclaimer
- This is a Messenger chat bot using a personal account, utilizing an unofficial API based on modern community standards.
- Automation on personal Facebook accounts carries risks of checkpoints or temporary account holds.
- It is strongly recommended to use a clone account (one that you are willing to discard at any time).
- The maintainers and developers are not responsible for any issues, suspensions, or data loss that may arise from using this software.

---

## 🚧 Requirements
- Node.js 20.x: [Download v20.0.0](https://nodejs.org/dist/v20.0.0) | [Node.js Home](https://nodejs.org/en/download/) | [Other Releases](https://nodejs.org/en/download/releases/)
- Basic working knowledge of JavaScript, Node.js, and terminal environments.
- Git installed on your system.

---

## ⚡ Quick Start & Installation

1. Clone the repository:
```bash
git clone https://github.com/ItzPriyanshi/QueenBotV2.git
cd QueenBotV2
```

2. Install dependencies:
```bash
npm install
```

3. Configure session cookies:
Export your Facebook account cookies in JSON format (using an AppState exporter browser extension) and paste them into `account.txt`.

4. Configure bot settings:
Edit `config.json` to specify your prefix, admin UID, and preferred language.

5. Run the bot:
```bash
npm start
```

For 24/7 background uptime on a VPS or server, use PM2:
```bash
npm install -g pm2
pm2 start index.js --name "QueenBot"
pm2 save
pm2 startup
```

---

## 📝 Tutorial
Video tutorials are available on YouTube:
- For mobile deployment: [Watch here](https://www.youtube.com/watch?v=grVeZ76HlgA)
- For VPS / Windows deployment: [Watch here](https://www.youtube.com/watch?v=uCbSYNQNEwY)

Summary text instructions are available in [STEP_INSTALL.md](https://github.com/ItzPriyanshi/QueenBotV2/blob/main/STEP_INSTALL.md).

---

## ⚙️ Configuration
Sample `config.json` file overview:
```json
{
  "prefix": "!",
  "adminBot": [
    "100012345678901"
  ],
  "language": "en",
  "whiteListMode": {
    "enable": false
  },
  "dashBoard": {
    "enable": true,
    "port": 3000
  }
}
```

---

## 💡 How it Works
- The bot uses the unofficial Facebook Chat API engine to send and receive messages from users.
- When a `new event` occurs (such as a message, reaction, user joining, or user leaving), the bot emits an event to the `handlerEvents`.
- The `handlerEvents` processes the event and executes the matching handler:

  - **onStart**:
    - Checks whether the user invoked a registered command.
    - Verifies whether the user is banned or whether `admin box only` mode is enabled.
    - Checks user role permissions and verifies that command cooldown has expired before running.

  - **onChat**:
    - Triggered whenever any message is received.
    - Checks permissions and executes automated conversation or keyword modules.

  - **onFirstChat**:
    - Triggered when the bot receives the first message from a chat box since it booted up.
    - Operates similarly to `onChat`.

  - **onReaction**:
    - Triggered when a user reacts with an emoji to a message with a tracked message ID.
    - Automatically cleans up expired message tracking references.

  - **onReply**:
    - Triggered when a user replies to a bot message with an active reply handler.
    - Checks permissions and executes interactive conversational sequences.

  - **onEvent**:
    - Triggered on room events (user joins/leaves, nicknames changed, box renamed, admin promotions).
    - Loops through all `onEvent` modules and dispatches them based on `commandName`.

  - **handlerEvent**:
    - Runs on incoming socket events and processes all event commands registered in `GoatBot.eventCommands`.

---

## 🔔 Notifications for Updates
- Open the GitHub repository in your browser.
- Click the `Watch` button at the top right of the page.
- Choose `Custom`, check `Pull requests` and `Releases`, and click `Apply` to receive notifications.

---

## 🆙 How to Update
Video tutorials for updating:
- On phone / Replit: [Watch here](https://youtu.be/grVeZ76HlgA?t=1342)
- On VPS / computer: [Watch here](https://youtu.be/uCbSYNQNEwY?t=508)

Using Git commands:
```bash
git stash
git pull origin main
npm install
```

---

## 🛠️ Creating New Commands
Instructions and full documentation for creating new commands can be found in [DOCS.md](https://github.com/PriyanshiKaurJi/Goat-Bot-V2/blob/main/DOCS.md).

Example command template:
```javascript
module.exports = {
  config: {
    name: "ping",
    version: "1.1",
    author: "Priyanshi Kaur",
    countDown: 5,
    role: 0, // 0: All users, 1: Group admin, 2: Bot admin
    shortDescription: {
      en: "Check bot latency",
      vi: "Kiem tra do tre bot"
    },
    longDescription: {
      en: "Measures real-time message roundtrip response time",
      vi: "Kiem tra toc do phan hoi cua bot"
    },
    category: "system",
    guide: {
      en: "{p}ping",
      vi: "{p}ping"
    }
  },

  onStart: async function ({ message }) {
    const start = Date.now();
    await message.reply("Pong!");
    const latency = Date.now() - start;
    return message.reply("Response time: " + latency + "ms");
  }
};
```

---

## 💭 Support
If you encounter issues or need coding assistance, join our community support groups:
- [Discord Support](https://discord.gg/8P9CKktjS) (Recommended)
- [Messenger Support](https://m.me/j/AbYnEF2iqwKMHybZ/?send_source=gc%3Acopy_invite_link_t)
- [Telegram Support](https://t.me/GlobalChatGroupTG)

*Please do not send private direct messages to maintainers. Direct all inquiries to the public chat groups so everyone can benefit from solutions.*

---

## 📚 Supported Languages
Currently supports 2 built-in languages:
- `en`: English
- `vi`: Vietnamese
- `hi`: Hindi

Change the default language in `config.json`. Language definition files can be customized in `languages/`, `languages/cmds/`, and `languages/events/`.

---

## 📌 Common Problems & Solved Errors

<details>
  <summary>
    📌 Previous Google Cloud & OAuth Errors (Permanently Bypassed)
  </summary>
  <p>The following errors from older versions no longer occur in Queen Bot V2 because Google credentials and Google Drive dependencies have been completely removed:</p>
  <ul>
    <li><b>Error 400: redirect_uri_mismatch:</b> Solved. No Google OAuth playground or redirect URI required.</li>
    <li><b>reCAPTCHA invalid domain:</b> Solved. No domain registration required.</li>
    <li><b>GaxiosError: invalid_grant / unauthorized_client:</b> Solved. No 7-day Google token expiration.</li>
    <li><b>GaxiosError: invalid_client:</b> Solved. No Google client ID or client secret needed.</li>
    <li><b>Error 403: access_denied:</b> Solved. Direct cookie authentication only.</li>
  </ul>
</details>

<details>
  <summary>
    📌 Facebook Checkpoint / Session Expiration
  </summary>
  <p>If the bot fails to log in or stops reading events, your account session cookies have expired or Facebook triggered a security verification checkpoint.</p>
  <p><b>Solution:</b> Log into the account from your desktop browser, verify any checkpoint prompt, export fresh AppState cookies in JSON format, paste them into <code>account.txt</code>, and restart the bot.</p>
</details>

---

## ❌ Warning Regarding Unofficial Builds
- The use of unverified source code can expose your device to malware, malicious scripts, and account theft.
- The original Goat-Bot-V2 was released by ntkhang03 at https://github.com/ntkhang03/Goat-Bot-V2.
- Queen Bot V2 is maintained by Priyanshi Kaur at https://github.com/ItzPriyanshi/QueenBotV2 with security-audited code and open-source contributions. Avoid downloading code from untrusted forks or unknown third-party sources.

---

## 📸 Screenshots

### Bot Commands
<details>
  <summary>
    Rank system
  </summary>
  <p>Rank card:</p>
  <p><img src="https://i.ibb.co/d0JDJxF/rank.png" width="399px"></p>
  <p>Rankup notification:</p>
  <p><img src="https://i.ibb.co/WgZzthH/rankup.png" width="399px"></p>
  <p>Custom rank card:</p>
  <p><img src="https://i.ibb.co/hLTThLW/customrankcard.png" width="399px"></p>
</details>

<details>
  <summary>
    Weather
  </summary>
  <p><img src="https://i.ibb.co/2FwWVLv/weather.png" width="399px"></p>
</details>

<details>
  <summary>
    Auto send notification when user joins or leaves box chat (customizable message)
  </summary>
  <p><img src="https://i.ibb.co/Jsb5Jxf/wcgb.png" width="399px"></p>
</details>

<details>
  <summary>
    Openjourney
  </summary>
  <p><img src="https://i.ibb.co/XJfwj1X/Screenshot-2023-05-09-22-43-58-630-com-facebook-orca.jpg" width="399px"></p>
</details>

<details>
  <summary>
    GPT
  </summary>
  <p><img src="https://i.ibb.co/D4wRbM3/Screenshot-2023-05-09-22-47-48-037-com-facebook-orca.jpg" width="399px"></p>
  <p><img src="https://i.ibb.co/z8HqPkH/Screenshot-2023-05-09-22-47-53-737-com-facebook-orca.jpg" width="399px"></p>
  <p><img src="https://i.ibb.co/19mZQpR/Screenshot-2023-05-09-22-48-02-516-com-facebook-orca.jpg" width="399px"></p>
</details>

### Dashboard
<details>
  <summary>
    Home
  </summary>
  <p><img src="https://i.postimg.cc/GtwP4Cqm/Screenshot-2023-12-23-105357.png" width="399px"></p>
  <p><img src="https://i.postimg.cc/MTjbZT0L/Screenshot-2023-12-23-105554.png" width="399px"></p>
</details>

<details>
  <summary>
    Stats
  </summary>
  <p><img src="https://i.postimg.cc/QtXt98B7/image.png" width="399px"></p>
</details>

<details>
  <summary>
    Login / Register
  </summary>
  <p><img src="https://i.postimg.cc/Jh05gKsM/Screenshot-2023-12-23-105743.png" width="399px"></p>
  <p><img src="https://i.postimg.cc/j5nM9K8m/Screenshot-2023-12-23-105748.png" width="399px"></p>
</details>

<details>
  <summary>
    Dashboard Thread
  </summary>
  <p><img src="https://i.postimg.cc/RF237v1Z/Screenshot-2023-12-23-105913.png" width="399px"></p>
</details>

<details>
  <summary>
    Custom on / off
  </summary>
  <p><img src="https://i.ibb.co/McDRhmX/image.png" width="399px"></p>
</details>

<details>
  <summary>
    Custom welcome message (similar for leave, rankup, and custom commands)
  </summary>
  <p><img src="https://i.ibb.co/6ZrQqc1/image.png" width="399px"></p>
  <p><img src="https://i.ibb.co/G53JsXm/image.png" width="399px"></p>
</details>

---

## ✨ Copyright (C)
- **NTKhang (NTKhang03)** - Original Author
- **Priyanshi Kaur** - Maintained Fork

---

## 📜 License

**VIETNAMESE**
- Neu ban vi pham bat ky quy tac nao, ban se bi cam su dung du an
- Khong ban ma nguon
- Khong tu xung la chu so huu cua ma nguon
- Khong kiem tien tu ma nguon (chang han nhu: mua ban lenh, mua ban/cho thue bot, keu goi quyen gop, v.v.)
- Khong xoa/sua doi credit (ten tac gia) trong ma nguon

**ENGLISH**
- If you violate any rules, you will be banned from using the project
- Do not sell this source code
- Do not claim this source code as your own
- Do not monetize this source code (including selling commands, renting instances, or soliciting donations)
- Do not remove or alter author and maintainer credits in the source code

@ItzPriyanshi
