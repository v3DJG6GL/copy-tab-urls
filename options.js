// options.js

// Helper function to log debug information both to console and UI
function debugLog(message, isError = false) {
    console.log(message);
    const debugOutput = document.getElementById("debugOutput");
    debugOutput.style.display = "block";
    const logEntry = document.createElement("div");
    logEntry.textContent = message;
    logEntry.classList.add('log-entry');
    if (isError) {
        logEntry.classList.add('error-entry');
        console.error(message);
    }
    debugOutput.appendChild(logEntry);
    debugOutput.scrollTop = debugOutput.scrollHeight;
}

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
        debugLog("loadTemplates: Retrieved stored data");
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
        debugLog(`loadTemplates: Loaded ${Object.keys(templates).length} templates`);
    } catch (error) {
        debugLog(`loadTemplates error: ${error.message}`, true);
    }
}

// Export templates to a JSON file
async function exportTemplates() {
    try {
        debugLog("Starting templates export...");
        const storedData = await browser.storage.local.get("templates");
        const templates = storedData.templates || {};
        debugLog(`Exporting ${Object.keys(templates).length} templates`);

        // Create the JSON content with proper indentation to preserve multiline formatting
        const jsonContent = JSON.stringify(templates, null, 2);

        // Create a blob and download link
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Generate timestamp for the filename in YYYY.MM.DD_HH.mm.ss format
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timestamp = `${year}.${month}.${day}_${hours}.${minutes}.${seconds}`;

        // Create and trigger a download with timestamp in filename
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `copy-tab-urls-templates_${timestamp}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Cleanup
        URL.revokeObjectURL(url);
        changeButtonColor(document.getElementById("exportTemplates"), "green", 2000);
        debugLog("Templates exported successfully");
    } catch (error) {
        debugLog(`Export error: ${error.message}`, true);
        changeButtonColor(document.getElementById("exportTemplates"), "red", 2000);
    }
}

// Import templates from a JSON file
async function importTemplates(event) {
    debugLog("Import process started...");
    // Display the debug output area
    const debugOutput = document.getElementById("debugOutput");
    debugOutput.style.display = "block";
    try {
        const file = event.target.files[0];
        if (!file) {
            debugLog("No file selected for import", true);
            changeButtonColor(document.getElementById("importTemplatesBtn"), "red", 2000);
            return;
        }
        debugLog(`File selected: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
        const reader = new FileReader();
        reader.onload = async function(e) {
            debugLog("File read completed");
            try {
                const jsonContent = e.target.result;
                debugLog(`File content length: ${jsonContent.length} characters`);
                let templates;
                try {
                    templates = JSON.parse(jsonContent);
                    debugLog(`JSON parsed successfully. Found ${Object.keys(templates).length} templates`);
                    // Log template names for debugging
                    Object.keys(templates).forEach(name => {
                        debugLog(`Template: ${name} - prefix length: ${templates[name].prefix ? templates[name].prefix.length : 0}, suffix length: ${templates[name].suffix ? templates[name].suffix.length : 0}`);
                    });
                } catch (parseError) {
                    debugLog(`JSON parsing error: ${parseError.message}`, true);
                    changeButtonColor(document.getElementById("importTemplatesBtn"), "red", 2000);
                    return;
                }
                try {
                    debugLog("Attempting to save templates to storage...");
                    await browser.storage.local.set({ templates });
                    debugLog("Templates saved to storage successfully");
                    // Clear the active template since we're replacing everything
                    await browser.storage.local.remove("activeTemplate");
                    debugLog("Active template cleared");
                    // Refresh the templates list
                    await loadTemplates();
                    debugLog("Template list refreshed");
                    changeButtonColor(document.getElementById("importTemplatesBtn"), "green", 2000);
                    debugLog("Import completed successfully");
                    // Reset the file input to allow importing the same file again
                    document.getElementById("importTemplatesFile").value = "";
                } catch (storageError) {
                    debugLog(`Storage error: ${storageError.message}`, true);
                    changeButtonColor(document.getElementById("importTemplatesBtn"), "red", 2000);
                }
            } catch (error) {
                debugLog(`General error during import: ${error.message}`, true);
                changeButtonColor(document.getElementById("importTemplatesBtn"), "red", 2000);
            }
        };
        reader.onerror = function(e) {
            debugLog(`FileReader error: ${reader.error}`, true);
            changeButtonColor(document.getElementById("importTemplatesBtn"), "red", 2000);
        };
        debugLog("Starting file read...");
        reader.readAsText(file);
    } catch (error) {
        debugLog(`Error in import process: ${error.message}`, true);
        changeButtonColor(document.getElementById("importTemplatesBtn"), "red", 2000);
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
            debugLog("Active template loaded");
        } else {
            document.getElementById("prefixInput").value = "";
            document.getElementById("suffixInput").value = "";
            document.getElementById("saveButton").textContent = "Save New Template";
            // Clear the active template
            await browser.storage.local.remove("activeTemplate");
            debugLog("Active template cleared");
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
            debugLog("Template deleted");
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
            debugLog("Template updated");
        } else {
            // Create new template
            document.getElementById("modal").style.display = "block";
            debugLog("Template save modal: opened");
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
            debugLog("New template saved successfully");
        }
    });

    document.getElementById("cancelTemplateNameButton").addEventListener("click", () => {
        document.getElementById("modal").style.display = "none";
        document.getElementById("templateNameInput").value = "";
        debugLog("Save new template: aborted");
    });

    // Add event listener for the rename template button
    document.getElementById("renameTemplate").addEventListener("click", async () => {
        const selectedTemplate = document.getElementById("templateSelect").value;
        if (selectedTemplate) {
            // Show the rename modal
            document.getElementById("renameModal").style.display = "block";
            debugLog("Template rename modal: opened");
            // Pre-fill the input with the current template name
            document.getElementById("newTemplateNameInput").value = selectedTemplate;
            debugLog("Template rename modal: input field pre-filled with current template name");
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
            debugLog("Template renamed successfully");
        }
    });

    // Add event listener for the cancel rename button
    document.getElementById("cancelRenameButton").addEventListener("click", () => {
        document.getElementById("renameModal").style.display = "none";
        document.getElementById("newTemplateNameInput").value = "";
        debugLog("Template rename aborted");
    });

    console.log("All event listeners registered, addon initialization complete");

    debugLog("DOM content loaded, initializing addon...");
    await loadTemplates();
    // Add event listeners for export/import
    document.getElementById("exportTemplates").addEventListener("click", exportTemplates);
    document.getElementById("importTemplatesBtn").addEventListener("click", () => {
        document.getElementById("importTemplatesFile").click();
        debugLog("Import button clicked, file dialog opened");
    });
    document.getElementById("importTemplatesFile").addEventListener("change", importTemplates);
    debugLog("All event listeners registered, addon initialization complete");
});
