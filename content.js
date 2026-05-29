(function () {
    const EXTENSION_ID_PREFIX = "apexAssist";

    function initapexAssist() {
        if (document.getElementById(`${EXTENSION_ID_PREFIX}-floating-button`)) {
            return;
        }

        createFloatingButton();
        createPanel();
    }

    function createFloatingButton() {
        const button = document.createElement("button");
        button.id = `${EXTENSION_ID_PREFIX}-floating-button`;
        button.innerText = "ApexAssist";

        button.addEventListener("click", () => {
            const panel = document.getElementById(`${EXTENSION_ID_PREFIX}-panel`);
            panel.style.display = panel.style.display === "none" || !panel.style.display
                ? "block"
                : "none";
        });

        document.body.appendChild(button);
    }

    function createPanel() {
        const panel = document.createElement("div");
        panel.id = `${EXTENSION_ID_PREFIX}-panel`;

        panel.innerHTML = `
      <div class="apexAssist-header">
        <h2>Apex Assist</h2>
        <button id="apexAssist-close" title="Close">×</button>
      </div>

      <div class="apexAssist-body">
        <div class="apexAssist-note">
          Tip: Select Apex code or error text in Developer Console, then click "Use Selected Text".
          If selection does not work, paste manually.
        </div>

        <div class="apexAssist-tabs">
          <button class="apexAssist-tab active" data-tab="test-generator">Test Generator</button>
          <button class="apexAssist-tab" data-tab="error-explainer">Error Explainer</button>
          <button class="apexAssist-tab" data-tab="apex-analyzer">Apex Analyzer</button>
        </div>

        <div id="apexAssist-section-test-generator" class="apexAssist-section active">
          <label class="apexAssist-label">Class Name</label>
          <input id="apexAssist-class-name" class="apexAssist-input" placeholder="Example: CaseHelper" />

          <label class="apexAssist-label">Paste Apex Method or Class</label>
          <textarea id="apexAssist-apex-code" class="apexAssist-textarea" placeholder="Paste Apex method or class here..."></textarea>

          <div class="apexAssist-button-row">
            <button id="apexAssist-use-selected-code" class="apexAssist-secondary-button">Use Selected Text</button>
            <button id="apexAssist-generate-test" class="apexAssist-primary-button">Generate Test Method</button>
            <button id="apexAssist-copy-test" class="apexAssist-secondary-button">Copy Output</button>
          </div>

          <div id="apexAssist-test-copy-success" class="apexAssist-success">Copied successfully.</div>

          <div id="apexAssist-test-output" class="apexAssist-output">Generated test method will appear here.</div>
        </div>

        <div id="apexAssist-section-error-explainer" class="apexAssist-section">
          <label class="apexAssist-label">Paste Apex Error</label>
          <textarea id="apexAssist-error-text" class="apexAssist-textarea" placeholder="Paste Apex error here..."></textarea>

          <div class="apexAssist-button-row">
            <button id="apexAssist-use-selected-error" class="apexAssist-secondary-button">Use Selected Text</button>
            <button id="apexAssist-explain-error" class="apexAssist-primary-button">Explain Error</button>
            <button id="apexAssist-copy-error" class="apexAssist-secondary-button">Copy Output</button>
          </div>

          <div id="apexAssist-error-copy-success" class="apexAssist-success">Copied successfully.</div>

          <div id="apexAssist-error-output" class="apexAssist-output">Error explanation will appear here.</div>
        </div>

        <div id="apexAssist-section-apex-analyzer" class="apexAssist-section">
            <label class="apexAssist-label">Paste Apex Code</label>
            <textarea id="apexAssist-analyzer-code" class="apexAssist-textarea" placeholder="Paste Apex code here..."></textarea>

            <div class="apexAssist-button-row">
                <button id="apexAssist-use-selected-analyzer-code" class="apexAssist-secondary-button">Use Selected Text</button>
                <button id="apexAssist-analyze-code" class="apexAssist-primary-button">Analyze Code</button>
                <button id="apexAssist-copy-analyzer-output" class="apexAssist-secondary-button">Copy Output</button>
            </div>

            <div id="apexAssist-analyzer-copy-success" class="apexAssist-success">Copied successfully.</div>

            <div id="apexAssist-analyzer-output" class="apexAssist-output">Apex analysis will appear here.</div>
        </div>
      </div>
    `;

        document.body.appendChild(panel);

        attachPanelEvents();
    }

    function attachPanelEvents() {
        document.getElementById("apexAssist-close").addEventListener("click", () => {
            document.getElementById("apexAssist-panel").style.display = "none";
        });

        document.querySelectorAll(".apexAssist-tab").forEach((tabButton) => {
            tabButton.addEventListener("click", () => {
                const selectedTab = tabButton.getAttribute("data-tab");
                switchTab(selectedTab);
            });
        });

        document.getElementById("apexAssist-use-selected-code").addEventListener("click", () => {
            const selectedText = getSelectedTextFromPage();
            document.getElementById("apexAssist-apex-code").value = selectedText || "";
        });

        document.getElementById("apexAssist-use-selected-error").addEventListener("click", () => {
            const selectedText = getSelectedTextFromPage();
            document.getElementById("apexAssist-error-text").value = selectedText || "";
        });

        document.getElementById("apexAssist-generate-test").addEventListener("click", () => {
            const apexCode = document.getElementById("apexAssist-apex-code").value;
            const className = document.getElementById("apexAssist-class-name").value;

            const output = generateApexTestMethod(apexCode, className);
            document.getElementById("apexAssist-test-output").innerText = output;
        });

        document.getElementById("apexAssist-explain-error").addEventListener("click", () => {
            const errorText = document.getElementById("apexAssist-error-text").value;

            const output = explainApexError(errorText);
            document.getElementById("apexAssist-error-output").innerText = output;
        });

        document.getElementById("apexAssist-copy-test").addEventListener("click", () => {
            const output = document.getElementById("apexAssist-test-output").innerText;
            copyToClipboard(output, "apexAssist-test-copy-success");
        });

        document.getElementById("apexAssist-copy-error").addEventListener("click", () => {
            const output = document.getElementById("apexAssist-error-output").innerText;
            copyToClipboard(output, "apexAssist-error-copy-success");
        });
        document.getElementById("apexAssist-use-selected-analyzer-code").addEventListener("click", () => {
            const selectedText = getSelectedTextFromPage();
            document.getElementById("apexAssist-analyzer-code").value = selectedText || "";
        });

        document.getElementById("apexAssist-analyze-code").addEventListener("click", () => {
            const apexCode = document.getElementById("apexAssist-analyzer-code").value;

            const output = analyzeApexCode(apexCode);
            document.getElementById("apexAssist-analyzer-output").innerText = output;
        });

        document.getElementById("apexAssist-copy-analyzer-output").addEventListener("click", () => {
            const output = document.getElementById("apexAssist-analyzer-output").innerText;
            copyToClipboard(output, "apexAssist-analyzer-copy-success");
        });
    }

    function switchTab(selectedTab) {
        document.querySelectorAll(".apexAssist-tab").forEach((button) => {
            button.classList.remove("active");
        });

        document.querySelectorAll(".apexAssist-section").forEach((section) => {
            section.classList.remove("active");
        });

        document.querySelector(`.apexAssist-tab[data-tab="${selectedTab}"]`).classList.add("active");
        document.getElementById(`apexAssist-section-${selectedTab}`).classList.add("active");
    }

    function getSelectedTextFromPage() {
        const selection = window.getSelection();

        if (selection && selection.toString().trim()) {
            return selection.toString();
        }

        const activeElement = document.activeElement;

        if (
            activeElement &&
            (activeElement.tagName === "TEXTAREA" || activeElement.tagName === "INPUT")
        ) {
            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;

            if (start !== undefined && end !== undefined && start !== end) {
                return activeElement.value.substring(start, end);
            }

            return activeElement.value;
        }

        return "";
    }

    async function copyToClipboard(text, successElementId) {
        if (!text || !text.trim()) {
            return;
        }

        try {
            await navigator.clipboard.writeText(text);

            const successElement = document.getElementById(successElementId);
            successElement.style.display = "block";

            setTimeout(() => {
                successElement.style.display = "none";
            }, 1800);
        } catch (error) {
            alert("Unable to copy output. Please select and copy manually.");
        }
    }

    function shouldInjectOnThisPage() {
        const url = window.location.href.toLowerCase();

        return (
            url.includes("/_ui/common/apex/debug/apexcsi") ||
            url.includes("/_ui/common/apex/debug/ApexCSIPage")
        );
    }

    if (shouldInjectOnThisPage()) {
        initapexAssist();
    }
})();