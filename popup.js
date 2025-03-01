// popup.js

function changeButtonColor(button, color, duration) {
  const originalColor = button.style.backgroundColor;
  button.style.backgroundColor = color;
  setTimeout(() => {
    button.style.backgroundColor = originalColor;
  }, duration);
}

async function loadTemplates() {
  const storedData = await browser.storage.local.get(["templates", "activeTemplate"]);
  const templates = storedData.templates || {};
  const activeTemplate = storedData.activeTemplate || "";
  const select = document.getElementById("templateSelect");
  select.innerHTML = '<option value="">Select a template</option>';

  const sortedTemplates = Object.keys(templates).sort().map(key => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key;
    if (key === activeTemplate) {
      option.selected = true;
    }
    return option;
  });

  sortedTemplates.forEach(option => select.appendChild(option));

  if (activeTemplate && templates[activeTemplate]) {
    document.getElementById("prefixInput").value = templates[activeTemplate].prefix || "";
    document.getElementById("suffixInput").value = templates[activeTemplate].suffix || "";
    document.getElementById("saveButton").textContent = "Update Template";
  } else {
    document.getElementById("saveButton").textContent = "Save New Template";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadTemplates();

  document.getElementById("templateSelect").addEventListener("change", async (event) => {
    const selectedTemplate = event.target.value;
    const templates = (await browser.storage.local.get("templates")).templates || {};

    if (selectedTemplate) {
      document.getElementById("prefixInput").value = templates[selectedTemplate].prefix || "";
      document.getElementById("suffixInput").value = templates[selectedTemplate].suffix || "";
      document.getElementById("saveButton").textContent = "Update Template";
      await browser.storage.local.set({ activeTemplate: selectedTemplate });
    } else {
      document.getElementById("prefixInput").value = "";
      document.getElementById("suffixInput").value = "";
      document.getElementById("saveButton").textContent = "Save New Template";
      await browser.storage.local.remove("activeTemplate");
    }
  });

  document.getElementById("deleteTemplate").addEventListener("click", async () => {
    const selectedTemplate = document.getElementById("templateSelect").value;
    if (selectedTemplate) {
      const storedData = await browser.storage.local.get("templates");
      const templates = storedData.templates || {};
      delete templates[selectedTemplate];
      await browser.storage.local.set({ templates });
      await browser.storage.local.remove("activeTemplate");
      await loadTemplates();
      changeButtonColor(document.getElementById("deleteTemplate"), "green", 2000);
    }
  });

  document.getElementById("saveButton").addEventListener("click", async () => {
    const selectedTemplate = document.getElementById("templateSelect").value;
    const prefix = document.getElementById("prefixInput").value;
    const suffix = document.getElementById("suffixInput").value;
    const storedData = await browser.storage.local.get("templates");
    const templates = storedData.templates || {};

    if (selectedTemplate && selectedTemplate !== "") {
      templates[selectedTemplate] = { prefix, suffix };
      await browser.storage.local.set({ templates, activeTemplate: selectedTemplate });
      changeButtonColor(document.getElementById("saveButton"), "green", 2000);
    } else {
      document.getElementById("modal").style.display = "block";
    }
  });

  document.getElementById("saveTemplateNameButton").addEventListener("click", async () => {
    const templateName = document.getElementById("templateNameInput").value;
    if (templateName) {
      const prefix = document.getElementById("prefixInput").value;
      const suffix = document.getElementById("suffixInput").value;
      const storedData = await browser.storage.local.get("templates");
      const templates = storedData.templates || {};
      templates[templateName] = { prefix, suffix };
      await browser.storage.local.set({ templates, activeTemplate: templateName });
      await loadTemplates();
      changeButtonColor(document.getElementById("saveButton"), "green", 2000);
    }
    document.getElementById("modal").style.display = "none";
    document.getElementById("templateNameInput").value = "";
  });

  document.getElementById("cancelTemplateNameButton").addEventListener("click", () => {
    document.getElementById("modal").style.display = "none";
    document.getElementById("templateNameInput").value = "";
  });

  document.getElementById("copyUrlsButton").addEventListener("click", async () => {
    const tabs = await browser.tabs.query({currentWindow: true, highlighted: true});
    const urls = tabs.map(t => t.url);
    const prefix = document.getElementById("prefixInput").value;
    const suffix = document.getElementById("suffixInput").value;

    let output = prefix ? `${prefix}\n` : '';
    output += urls.map(url => `${url}${suffix}`).join("\n");

    navigator.clipboard.writeText(output);
    changeButtonColor(document.getElementById("copyUrlsButton"), "green", 2000);
  });

  document.getElementById("copyActiveUrlButton").addEventListener("click", async () => {
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    const activeTab = tabs[0];
    const prefix = document.getElementById("prefixInput").value;
    const suffix = document.getElementById("suffixInput").value;

    const output = `${prefix ? prefix + '\n' : ''}${activeTab.url}${suffix}`;
    navigator.clipboard.writeText(output);
    changeButtonColor(document.getElementById("copyActiveUrlButton"), "green", 2000);
  });

  // Export Templates
  document.getElementById("exportTemplates").addEventListener("click", async () => {
    const storedData = await browser.storage.local.get("templates");
    const templates = storedData.templates || {};
    const blob = new Blob([JSON.stringify(templates, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "url_templates.json";
    a.click();
    URL.revokeObjectURL(url);
    changeButtonColor(document.getElementById("exportTemplates"), "green", 2000);
  });

  // Import Templates
  document.getElementById("importTemplates").addEventListener("click", () => {
    document.getElementById("importFile").click();
  });

  document.getElementById("importFile").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const templates = JSON.parse(e.target.result);
          await browser.storage.local.set({ templates });
          await loadTemplates();
          changeButtonColor(document.getElementById("importTemplates"), "green", 2000);
        } catch (error) {
          console.error("Error importing templates:", error);
          changeButtonColor(document.getElementById("importTemplates"), "red", 2000);
        }
      };
      reader.readAsText(file);
    }
  });
});
