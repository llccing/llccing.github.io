### **Overview of Steps**

1.  **Install Prerequisites:**
    *   Python (the programming language)
    *   Git (for version control, used by oTree)
    *   A Code Editor (Visual Studio Code is highly recommended)
2.  **Set Up Your Project Environment:**
    *   Create a project folder.
    *   Create and activate a "virtual environment" (this is crucial for avoiding conflicts).
3.  **Install and Test oTree 5:**
    *   Install the oTree library using `pip`.
    *   Create a new oTree project.
    *   Run the development server to verify it works.

---

### **Step 1: Install Prerequisites**

#### **A. Install Python**

oTree is a Python framework, so you need Python installed first.

1.  **Download Python:** Go to the official Python website: [https://www.python.org/downloads/](https://www.python.org/downloads/)
    *   Download a stable version like Python 3.10 or 3.11. These are well-tested with oTree 5.

2.  **Run the Installer:**
    *   Open the downloaded `.exe` file.
    *   **CRITICAL:** On the first screen of the installer, check the box that says **"Add Python to PATH"**. This is the most common mistake people make. It allows you to run `python` from any command prompt.
    *   Click "Install Now".

    

3.  **Verify the Installation:**
    *   Press the `Win` key, type `cmd`, and open the **Command Prompt**.
    *   Type the following commands and press Enter after each one. You should see version numbers without any errors.
      ```bash
      python --version
      pip --version
      ```

#### **B. Install Git**

oTree uses Git behind the scenes, so it's a required dependency.

1.  **Download Git:** Go to the official Git website: [https://git-scm.com/download/win](https://git-scm.com/download/win)
    *   The download should start automatically.

2.  **Run the Installer:**
    *   Open the downloaded `.exe` file.
    *   You can safely accept the default settings for all installation steps by clicking "Next" repeatedly and then "Install". The default settings are perfect for our needs.

3.  **Verify the Installation:**
    *   Open a **new** Command Prompt (or reuse the old one).
    *   Type the following command and press Enter:
      ```bash
      git --version
      ```
    *   You should see the installed Git version.

#### **C. Install a Code Editor (VS Code)**

While you can use Notepad, a proper code editor will make your life much easier. VS Code is the industry standard.

1.  **Download VS Code:** Go to [https://code.visualstudio.com/](https://code.visualstudio.com/) and download the installer for Windows.
2.  **Run the Installer:** Accept the default settings. It's helpful to ensure "Add to PATH" and "Open with Code" options are checked during installation.
3.  **Install Python Extension:**
    *   Open VS Code.
    *   Go to the Extensions view (click the icon with four squares on the left sidebar).
    *   Search for "Python" and install the one by Microsoft. This provides syntax highlighting, debugging, and other useful features.

---

### **Step 2: Set Up Your Project Environment**

Never install oTree directly into your main system Python. Always use a virtual environment to keep your project's dependencies isolated.

1.  **Create a Project Folder:**
    *   Open File Explorer and create a folder where you will store all your oTree projects. For example, `C:\oTree_Projects`.

2.  **Open the Folder in VS Code:**
    *   Right-click on your new `oTree_Projects` folder and select "Open with Code".

3.  **Open the Integrated Terminal:**
    *   In VS Code, go to the top menu and click `Terminal > New Terminal`. A command line will appear at the bottom of the editor.

4.  **Create a Virtual Environment:**
    *   In the VS Code terminal, type the following command. This creates a subfolder named `venv` which will contain a sandboxed copy of Python for your project.
      ```bash
      python -m venv venv
      ```

5.  **Activate the Virtual Environment:**
    *   Now, you must "activate" the environment. This tells your terminal to use the Python and pip from the `venv` folder instead of the global system ones.
      ```bash
      .\venv\Scripts\activate
      ```
    *   You will know it worked because your terminal prompt will now start with `(venv)`.
      > **Example:** `(venv) C:\oTree_Projects>`

---

### **Step 3: Install and Test oTree 5**

Now that your environment is active, you can safely install oTree.

1.  **Install oTree 5:**
    *   To get the latest version of oTree 5 (but not oTree 6 or newer), use the following command in your **activated** terminal:
      ```bash
      pip install "otree<6"
      ```
    *   `pip` will now download and install oTree and all its dependencies. This might take a few minutes.

2.  **Create Your First oTree Project:**
    *   While still inside the `C:\oTree_Projects` directory, run this command to create a project folder named `my_first_project`:
      ```bash
      otree startproject my_first_project
      ```

3.  **Navigate into Your Project Directory:**
    *   Your files are inside the new folder, so you need to move into it:
      ```bash
      cd my_first_project
      ```

4.  **Run the Development Server:**
    *   This is the final test. Start the oTree server by running:
      ```bash
      otree devserver
      ```
    *   **Firewall Prompt:** The first time you run this, Windows Defender Firewall will likely pop up. Click **"Allow access"**.
    *   You will see output in your terminal, ending with something like:
      ```
      Starting development server at http://127.0.0.1:8000/
      Quit the server with CTRL-BREAK.
      ```

5.  **View Your Site:**
    *   Open a web browser (like Chrome or Firefox) and go to the address **`http://127.0.0.1:8000`**.
    *   You should see the oTree admin interface.

**Congratulations! You have successfully installed and run oTree 5 on Windows 11.**

---

### **Summary and Quick Reference**

To work on your project in the future:

1.  Open your project folder (`C:\oTree_Projects\my_first_project`) in VS Code.
2.  Open a new terminal (`Ctrl+Shift+` `).
3.  Activate the virtual environment: `.\venv\Scripts\activate`
4.  Run the server: `otree devserver`
5.  To stop the server, go to the terminal and press `Ctrl+C`.
6.  To leave the virtual environment, just type `deactivate`.

