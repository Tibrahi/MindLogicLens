To initialize your GitHub configuration and credentials purely through the **Command Prompt (CMD)**, you need to handle two separate things: your **Git identity** (name and email) and your **Git credentials** (the `ghp_` token).

Here is the step-by-step guide to doing it all via CMD.

---

### 1. Initialize Global Configuration
First, tell Git who you are. This information is attached to every commit you make.

Open **Command Prompt** and run these three commands:

```cmd
git config --global user.name "Your Name"
git config --global user.email "your_email@example.com"
git config --global credential.helper manager
```

* **`user.name`**: Usually your full name or GitHub handle.
* **`user.email`**: Must match the email address verified on your GitHub account.
* **`credential.helper manager`**: This tells Windows to securely store your token so you don't have to type it every single time.

---

### 2. Initialize the Username and Token (Password)
Since GitHub no longer accepts your actual account password for CMD actions, you must use your `ghp_` token. Use the `cmdkey` utility to save it directly into the Windows Vault:

```cmd
cmdkey /add:git:https://github.com /user:YOUR_GITHUB_USERNAME /pass:ghp_YOUR_TOKEN_HERE
```

> **Note:** Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username (e.g., `octocat`) and paste your full token starting with `ghp_`.

---

### 3. Verify Your Configuration
To make sure everything is set up correctly, run:

```cmd
git config --list
```

This will output a list of your settings. Look for these lines to confirm:
* `user.name=Your Name`
* `user.email=your_email@example.com`
* `credential.helper=manager`

---

### 4. Testing the Connection
The best way to "activate" these settings is to try and connect to a repository. Move to a folder where you want to work and run:

```cmd
git ls-remote https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
```

If it displays a list of numbers and letters (hashes) without asking for a login, **you are fully initialized.**

### Common Fix: "Permission Denied"
If you get a permission error even after doing this, it usually means your `ghp_` token doesn't have the right "Scopes." 
* Go to **GitHub Settings** > **Developer Settings** > **Personal Access Tokens**.
* Click your token and ensure the **`repo`** box is checked.

Would you like me to show you how to set this up for a specific project folder instead of globally?