// popup.js

function changeButtonColor(button, color, duration) {
  const originalColor = button.style.backgroundColor;
  button.style.backgroundColor = color;
  setTimeout(() => {
    button.style.backgroundColor = originalColor;
  }, duration);
}

async function loadTemplates() {
  try {
    const storedData = await browser.storage.local.get(["templates", "activeTemplate"]);
    console.log("loadTemplates: Retrieved stored data");
    const templates = storedData.templates || {};
    const activeTemplate = storedData.activeTemplate || "";
    const select = document.getElementById("templateSelect");
    select.innerHTML = '<option value="">Select a template</option>'; // Ensure the initial option is present

    // Case-insensitive sorting
    const sortedTemplateNames = Object.keys(templates).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    const sortedTemplates = sortedTemplateNames.map(key => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = key;
      if (key === activeTemplate) {
        option.selected = true;
      }
      return option;
    });

    sortedTemplates.forEach(option => select.appendChild(option));

    // If an active template is set, load its values
    if (activeTemplate && templates[activeTemplate]) {
      document.getElementById("prefixInput").value = templates[activeTemplate].prefix || "";
      document.getElementById("suffixInput").value = templates[activeTemplate].suffix || "";
      document.getElementById("saveButton").textContent = "Update Template";
    } else {
      document.getElementById("prefixInput").value = "";
      document.getElementById("suffixInput").value = "";
      document.getElementById("saveButton").textContent = "Save New Template";
    }
    console.log(`loadTemplates: Loaded ${Object.keys(templates).length} templates`);
  } catch (error) {
    console.error(`loadTemplates error: ${error.message}`);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM content loaded, initializing addon...");
  await loadTemplates();

  document.getElementById("templateSelect").addEventListener("change", async (event) => {
    const selectedTemplate = event.target.value;
    const templates = (await browser.storage.local.get("templates")).templates || {};
    if (selectedTemplate) {
      document.getElementById("prefixInput").value = templates[selectedTemplate].prefix || "";
      document.getElementById("suffixInput").value = templates[selectedTemplate].suffix || "";
      document.getElementById("saveButton").textContent = "Update Template";
      // Save the active template
      await browser.storage.local.set({ activeTemplate: selectedTemplate });
      console.log("Active template loaded");
    } else {
      document.getElementById("prefixInput").value = "";
      document.getElementById("suffixInput").value = "";
      document.getElementById("saveButton").textContent = "Save New Template";
      // Clear the active template
      await browser.storage.local.remove("activeTemplate");
      console.log("Active template cleared");
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
      console.log("Template deleted");
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
      // Update existing template
      templates[selectedTemplate] = { prefix, suffix };
      await browser.storage.local.set({ templates, activeTemplate: selectedTemplate });
      changeButtonColor(document.getElementById("saveButton"), "green", 2000);
      console.log("Template updated");
    } else {
      // Create new template
      document.getElementById("modal").style.display = "block";
      console.log("Template save modal: opened");
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
      document.getElementById("modal").style.display = "none";
      document.getElementById("templateNameInput").value = "";
      console.log("New template saved successfully");
    }
  });

  document.getElementById("cancelTemplateNameButton").addEventListener("click", () => {
    document.getElementById("modal").style.display = "none";
    document.getElementById("templateNameInput").value = "";
    console.log("Save new template: aborted");
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
    console.log("Marked URLs copied");
  });

  document.getElementById("copyActiveUrlButton").addEventListener("click", async () => {
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    const activeTab = tabs[0];
    const prefix = document.getElementById("prefixInput").value;
    const suffix = document.getElementById("suffixInput").value;
    const output = `${prefix ? prefix + '\n' : ''}${activeTab.url}${suffix}`;
    navigator.clipboard.writeText(output);
    changeButtonColor(document.getElementById("copyActiveUrlButton"), "green", 2000);
    console.log("Active URL copied");
  });

  // Add event listener for opening options page
  document.getElementById("openOptionsBtn").addEventListener("click", () => {
    browser.runtime.openOptionsPage();
    console.log("Options addon menu opened");

  });

  // Add event listener for the rename template button
  document.getElementById("renameTemplate").addEventListener("click", async () => {
    const selectedTemplate = document.getElementById("templateSelect").value;
    if (selectedTemplate) {
      // Show the rename modal
      document.getElementById("renameModal").style.display = "block";
      console.log("Template rename modal: opened");
      // Pre-fill the input with the current template name
      document.getElementById("newTemplateNameInput").value = selectedTemplate;
      console.log("Template rename modal: input field pre-filled with current template name");
    }
  });

  // Add event listener for the rename confirmation button
  document.getElementById("renameTemplateButton").addEventListener("click", async () => {
    const selectedTemplate = document.getElementById("templateSelect").value;
    const newTemplateName = document.getElementById("newTemplateNameInput").value;
    if (selectedTemplate && newTemplateName && selectedTemplate !== newTemplateName) {
      const storedData = await browser.storage.local.get("templates");
      const templates = storedData.templates || {};
      // Create a new template with the new name but same settings
      templates[newTemplateName] = templates[selectedTemplate];
      // Delete the old template
      delete templates[selectedTemplate];
      // Check if the renamed template was the active one
      const activeTemplateData = await browser.storage.local.get("activeTemplate");
      const activeTemplate = activeTemplateData.activeTemplate || "";
      // If the renamed template was active, update the active template reference
      if (activeTemplate === selectedTemplate) {
        await browser.storage.local.set({ activeTemplate: newTemplateName });
      }
      // Save the updated templates
      await browser.storage.local.set({ templates });
      // Reload templates to update the UI
      await loadTemplates();
      // Provide visual feedback
      changeButtonColor(document.getElementById("renameTemplate"), "green", 2000);
      // Hide the modal
      document.getElementById("renameModal").style.display = "none";
      document.getElementById("newTemplateNameInput").value = "";
      console.log("Template renamed successfully");
    }
  });

  // Add event listener for the cancel rename button
  document.getElementById("cancelRenameButton").addEventListener("click", () => {
    document.getElementById("renameModal").style.display = "none";
    document.getElementById("newTemplateNameInput").value = "";
    console.log("Template rename aborted");
  });

  console.log("All event listeners registered, addon initialization complete");
});
