
(() => {
  const editor = document.querySelector(".editor-area");
  const editorShell = document.querySelector(".editor-shell");
  const previewPanel = document.querySelector(".preview-panel");
  const previewContent = previewPanel?.querySelector(".preview-content");
  const tabsContainer = document.querySelector(".tabs");
  const newTabButton = document.querySelector('.tabs-container .icon-btn[title="New Tab"]');
  const findWidget = document.querySelector(".find-widget");
  const findInput = document.querySelector(".find-input");
  const findButtons = findWidget ? findWidget.querySelectorAll(".icon-btn") : [];
  const findCount = findWidget ? findWidget.querySelector(".find-count") : null;

  const btnSearch = document.querySelector('.header-actions .icon-btn[data-action="search"]');
  const btnPreview = document.querySelector('.header-actions .icon-btn[data-action="preview-toggle"]');
  const btnZen = document.querySelector('.header-actions .icon-btn[data-action="zen-toggle"]');
  const btnExport = document.querySelector('.header-actions .icon-btn[data-action="export-menu"]');
  const btnSettings = document.querySelector('.header-actions .icon-btn[data-action="settings-open"]');
  const exportDropdown = document.getElementById("export-dropdown");
  const settingsModal = document.getElementById("settings-modal");
  const settingsClose = settingsModal?.querySelector('[data-action="settings-close"]');
  const settingsToggles = settingsModal ? Array.from(settingsModal.querySelectorAll(".toggle[data-setting]")) : [];
  const settingsSelects = settingsModal ? Array.from(settingsModal.querySelectorAll("select[data-setting]")) : [];
  const aboutModal = document.getElementById("about-modal");
  const aboutClose = aboutModal?.querySelector('[data-action="about-close"]');
  const aboutUpdates = aboutModal?.querySelector('[data-action="about-updates"]');
  const aboutVersion = aboutModal?.querySelector("[data-about-version]");
  const aboutAuthor = aboutModal?.querySelector("[data-about-author]");

  const statusRight = document.querySelectorAll("footer .footer-right .status-item");
  const statusLnCol = statusRight[0];
  const statusChars = statusRight[1];
  const statusTabSize = statusRight[2];
  const statusMarkdown = statusRight[3];
  const statusNotify = statusRight[4];
  const statusLeft = document.querySelectorAll("footer .footer-left .status-item");
  const statusAutoSave = statusLeft[2];
  const statusEncoding = statusLeft[3];

  const menubar = document.querySelector(".menubar");
  const menuItems = Array.from(document.querySelectorAll('.menubar .menu-item[data-menu]'));

  const toolbar = document.querySelector(".floating-toolbar");
  const headingSelector = document.querySelector('.font-selector[data-tooltip="Headings"]');
  const toolButtons = Array.from(document.querySelectorAll(".floating-toolbar .tool-btn"));

  const headingPopover = document.getElementById("heading-popover");
  const commandPalette = document.getElementById("command-palette");
  const commandInput = commandPalette?.querySelector("input");
  const commandList = commandPalette?.querySelector(".command-list");

  const api = window.lp || null;
  let isWrap = true;
  let lastSavedPath = "";
  let tabCounter = 1;
  let activeTabId = "";
  const tabs = new Map();
  const tabSizes = [2, 4, 8];
  let tabSizeIndex = 1;
  let autosaveEnabled = true;
  let autosaveTimer = null;
  let markdownMode = true;
  const notepadMode = false;
  let isPreviewSplit = false;
  let isZenMode = false;
  let isFullScreen = false;

  let menuOpenIndex = -1;
  let menuFocusedIndex = -1;
  let savedRange = null;
  let paletteIndex = 0;
  let findMatches = [];
  let currentFindIndex = -1;
  let lastClosedTab = null;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const commands = [
    { name: "Bold", action: () => exec("bold") },
    { name: "Italic", action: () => exec("italic") },
    { name: "Insert Link", action: () => insertLink() },
    { name: "Heading 1", action: () => formatBlock("H1") },
    { name: "Heading 2", action: () => formatBlock("H2") },
    { name: "Heading 3", action: () => formatBlock("H3") },
    { name: "Checklist", action: () => insertChecklist() }
  ];
  let commandFiltered = commands;

  function saveSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        savedRange = range.cloneRange();
      }
    }
  }

  function restoreSelection() {
    if (!savedRange) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
  }

  function getActiveEditorRange() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        return range;
      }
    }
    if (savedRange && editor.contains(savedRange.commonAncestorContainer)) {
      return savedRange;
    }
    return null;
  }

  function createTab(title, contentHtml, filePath) {
    const id = `tab-${tabCounter++}`;
    const tab = {
      id,
      title: title || "Untitled",
      filePath: filePath || null,
      isDirty: false,
      contentHtml: contentHtml || ""
    };
    tabs.set(id, tab);
    const tabEl = document.createElement("div");
    tabEl.className = "tab";
    tabEl.dataset.tabId = id;
    tabEl.innerHTML = `
      <span>${tab.title}</span>
      <i class="ri-close-line tab-close"></i>
    `;
    tabsContainer.appendChild(tabEl);
    tabEl.classList.add("tab-enter");
    requestAnimationFrame(() => {
      tabEl.classList.remove("tab-enter");
    });
    return tab;
  }

  function setTabTitle(tab, title) {
    if (!tab || !title) return;
    tab.title = title;
    const tabEl = getTabEl(tab.id);
    const label = tabEl?.querySelector("span");
    if (label) {
      label.textContent = title;
    }
  }

  function setTabDirty(tab, dirty) {
    if (!tab) return;
    tab.isDirty = dirty;
    const tabEl = getTabEl(tab.id);
    if (!tabEl) return;
    const existingDot = tabEl.querySelector(".unsaved-dot");
    if (dirty && !existingDot) {
      const dot = document.createElement("span");
      dot.className = "unsaved-dot";
      dot.title = "Unsaved";
      tabEl.appendChild(dot);
    } else if (!dirty && existingDot) {
      existingDot.remove();
    }
  }

  function getTabEl(id) {
    return tabsContainer.querySelector(`.tab[data-tab-id="${id}"]`);
  }

  function persistActiveTab() {
    const tab = tabs.get(activeTabId);
    if (!tab) return;
    tab.contentHtml = editor.innerHTML;
  }

  function setActiveTab(id) {
    if (!tabs.has(id)) return;
    if (activeTabId && activeTabId !== id) {
      persistActiveTab();
      const prevEl = getTabEl(activeTabId);
      prevEl?.classList.remove("active");
    }
    activeTabId = id;
    const tab = tabs.get(id);
    const tabEl = getTabEl(id);
    tabEl?.classList.add("active");
    editor.innerHTML = tab.contentHtml || "";
    lastSavedPath = tab.filePath || "";
    updateStatus();
    updatePreview();
  }

  function closeTab(id) {
    const tabEl = getTabEl(id);
    const wasActive = id === activeTabId;
    const closedTab = tabs.get(id);
    tabs.delete(id);
    if (tabEl) {
      tabEl.classList.add("tab-exit");
      tabEl.addEventListener("transitionend", () => tabEl.remove(), { once: true });
    }

    const remaining = Array.from(tabs.keys());
    if (remaining.length === 0) {
      const newTab = createTab("Untitled", "", null);
      setActiveTab(newTab.id);
      if (closedTab) {
        lastClosedTab = { ...closedTab, wasActive };
      }
      if (lastClosedTab) {
        showUndoToast("Tab closed", () => restoreClosedTab());
      }
      return;
    }
    if (wasActive) {
      setActiveTab(remaining[0]);
    }
    if (closedTab) {
      lastClosedTab = { ...closedTab, wasActive };
      showUndoToast("Tab closed", () => restoreClosedTab());
    }
  }

  function restoreClosedTab() {
    if (!lastClosedTab) return;
    const restored = createTab(lastClosedTab.title, lastClosedTab.contentHtml, lastClosedTab.filePath);
    const tab = tabs.get(restored.id);
    if (tab) {
      tab.isDirty = lastClosedTab.isDirty;
      tab.contentHtml = lastClosedTab.contentHtml;
      tab.filePath = lastClosedTab.filePath;
      setTabDirty(tab, tab.isDirty);
    }
    if (lastClosedTab.wasActive) {
      setActiveTab(restored.id);
    }
    lastClosedTab = null;
  }

  function updateToolbarStates() {
    const boldBtn = getToolButton("bold");
    const italicBtn = getToolButton("italic");
    const underlineBtn = getToolButton("underline");
    const alignLeftBtn = getToolButton("align-left");
    const alignCenterBtn = getToolButton("align-center");
    const alignRightBtn = getToolButton("align-right");
    const listBtn = getToolButton("list");
    const checklistBtn = getToolButton("checklist");
    const linkBtn = getToolButton("link");

    boldBtn?.classList.toggle("active", document.queryCommandState("bold"));
    italicBtn?.classList.toggle("active", document.queryCommandState("italic"));
    underlineBtn?.classList.toggle("active", document.queryCommandState("underline"));
    alignLeftBtn?.classList.toggle("active", document.queryCommandState("justifyLeft"));
    alignCenterBtn?.classList.toggle("active", document.queryCommandState("justifyCenter"));
    alignRightBtn?.classList.toggle("active", document.queryCommandState("justifyRight"));

    const inChecklist = !!closestTag("ul", "checklist");
    const inList = document.queryCommandState("insertUnorderedList");
    listBtn?.classList.toggle("active", inList && !inChecklist);
    checklistBtn?.classList.toggle("active", inChecklist);

    linkBtn?.classList.toggle("active", !!closestTag("a"));
  }

  function getToolButton(action) {
    return toolButtons.find((btn) => btn.dataset.action === action);
  }
  function exec(command, value) {
    if (notepadMode && command !== "insertText") return;
    editor.focus();
    document.execCommand(command, false, value);
    updateToolbarStates();
    updateStatus();
    updatePreview();
  }

  function handleToolbarAction(action) {
    if (!action) return;
    if (notepadMode && action !== "word-wrap") {
      return;
    }
    saveSelection();
    switch (action) {
      case "bold":
        exec("bold");
        break;
      case "italic":
        exec("italic");
        break;
      case "underline":
        exec("underline");
        break;
      case "align-left":
        exec("justifyLeft");
        break;
      case "align-center":
        exec("justifyCenter");
        break;
      case "align-right":
        exec("justifyRight");
        break;
      case "list":
        exec("insertUnorderedList");
        break;
      case "checklist":
        insertChecklist();
        break;
      case "link":
        insertLink();
        break;
      case "undo":
        api ? api.action("edit:undo") : exec("undo");
        break;
      case "redo":
        api ? api.action("edit:redo") : exec("redo");
        break;
      case "clear":
        clearFormatting();
        break;
      case "word-wrap":
        toggleWordWrap();
        break;
      case "format:title":
        applyHeading("H1");
        break;
      case "format:subtitle":
        applyHeading("H2");
        break;
      case "format:heading":
        applyHeading("H3");
        break;
      case "format:subheading":
        applyHeading("H4");
        break;
      case "format:section":
        applyHeading("H5");
        break;
      case "format:subsection":
        applyHeading("H6");
        break;
      case "format:body":
        applyHeading("P");
        break;
      default:
        break;
    }
    editor.focus();
  }

  function formatBlock(tag) {
    if (notepadMode) return;
    const range = getActiveEditorRange();
    if (!range) return;
    if (range.collapsed) {
      applyFormatBlockWithCaret(tag, range);
      return;
    }
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
    document.execCommand("formatBlock", false, tag);
    updateToolbarStates();
    updateStatus();
    updatePreview();
  }

  function applyHeading(tag) {
    if (notepadMode) return;
    const range = getActiveEditorRange();
    if (!range) return;
    if (range.collapsed) {
      applyFormatBlockWithCaret(tag, range);
      return;
    }
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
    document.execCommand("formatBlock", false, tag);
    updateToolbarStates();
    updateStatus();
    updatePreview();
  }

  function applyFormatBlockWithCaret(tag, range) {
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
    const markerNode = insertCaretMarker(range);
    editor.focus();
    document.execCommand("formatBlock", false, tag);
    restoreCaretFromMarker(markerNode, selection);
    updateToolbarStates();
    updateStatus();
    updatePreview();
  }

  function insertCaretMarker(range) {
    const markerText = "\u200B";
    const markerNode = document.createElement("span");
    markerNode.setAttribute("data-caret-marker", "true");
    markerNode.appendChild(document.createTextNode(markerText));
    range.insertNode(markerNode);
    return markerNode;
  }

  function restoreCaretFromMarker(markerNode, selection) {
    const markerText = "\u200B";
    let node = markerNode;
    if (!node || !editor.contains(node)) {
      node = editor.querySelector('[data-caret-marker="true"]');
    }
    if (!node) return;
    const caretRange = document.createRange();
    if (node.nodeType === Node.TEXT_NODE) {
      const index = node.textContent.indexOf(markerText);
      if (index === -1) return;
      node.textContent = node.textContent.replace(markerText, "");
      const safeOffset = Math.min(index, node.textContent.length);
      caretRange.setStart(node, safeOffset);
    } else {
      caretRange.setStartAfter(node);
    }
    caretRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caretRange);
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.length === 0) {
        node.remove();
      }
    } else {
      node.remove();
    }
  }

  function collectBlocksInRange(range) {
    const blocks = [];
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (!node.matches("p,h1,h2,h3,h4,h5,h6,blockquote,div")) {
            return NodeFilter.FILTER_SKIP;
          }
          if (node.closest("ul,ol")) {
            return NodeFilter.FILTER_SKIP;
          }
          return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      }
    );
    let node;
    while ((node = walker.nextNode())) {
      blocks.push(node);
    }
    return blocks;
  }

  function getBlockElement(node) {
    if (!node) return null;
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return el?.closest("p,h1,h2,h3,h4,h5,h6,blockquote,div");
  }

  function replaceBlockTag(block, tagName) {
    if (!block || block.tagName.toLowerCase() === tagName.toLowerCase()) return;
    const replacement = document.createElement(tagName.toLowerCase());
    while (block.firstChild) {
      replacement.appendChild(block.firstChild);
    }
    block.replaceWith(replacement);
  }

  function insertHtml(html) {
    if (notepadMode) return;
    editor.focus();
    document.execCommand("insertHTML", false, html);
    updateStatus();
    updatePreview();
  }

  function insertChecklist() {
    if (notepadMode) return;
    restoreSelection();
    const selection = window.getSelection();
    const text = selection && !selection.isCollapsed ? selection.toString() : "";
    const lines = text ? text.split(/\n+/) : [""];
    const items = lines
      .map((line) => `<li><label><input type="checkbox"> ${escapeHtml(line)}</label></li>`)
      .join("");
    insertHtml(`<ul class="checklist">${items}</ul>`);
    updateToolbarStates();
  }

  function insertLink() {
    if (notepadMode) return;
    restoreSelection();
    const selection = window.getSelection();
    const anchor = closestTag("a");
    const defaultUrl = anchor?.getAttribute("href") || "";
    const url = prompt("Enter URL (leave empty to remove link):", defaultUrl);
    if (url === null) return;
    if (!url) {
      if (anchor) {
        exec("unlink");
      }
      return;
    }
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    if (selection && selection.isCollapsed) {
      insertHtml(`<a href="${escapeHtml(normalized)}">${escapeHtml(url)}</a>`);
    } else {
      exec("createLink", normalized);
    }
    updateToolbarStates();
  }

  function clearFormatting() {
    if (notepadMode) return;
    exec("removeFormat");
    exec("unlink");
  }

  function setWordWrap(enabled) {
    isWrap = enabled;
    editor.classList.toggle("no-wrap", !isWrap);
    getToolButton("word-wrap")?.classList.toggle("active", !isWrap);
    if (settingsModal?.classList.contains("open")) {
      syncSettingsUI();
    }
  }

  function toggleWordWrap() {
    setWordWrap(!isWrap);
    localStorage.setItem("lp:wordWrap", isWrap ? "1" : "0");
  }

  function escapeHtmlText(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderInlineMarkdown(value) {
    let html = escapeHtmlText(value);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return html;
  }

  function renderMarkdown(value) {
    const lines = value.replace(/\r\n/g, "\n").split("\n");
    let html = "";
    let inCode = false;
    let codeLines = [];
    let listType = null;

    const closeList = () => {
      if (listType) {
        html += `</${listType}>`;
        listType = null;
      }
    };

    lines.forEach((line) => {
      if (line.trim().startsWith("```")) {
        if (!inCode) {
          closeList();
          inCode = true;
          codeLines = [];
        } else {
          html += `<pre class="lp-code-block"><code>${escapeHtmlText(codeLines.join("\n"))}</code></pre>`;
          inCode = false;
        }
        return;
      }
      if (inCode) {
        codeLines.push(line);
        return;
      }
      if (!line.trim()) {
        closeList();
        return;
      }
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        closeList();
        const level = headingMatch[1].length;
        html += `<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`;
        return;
      }
      if (/^>\s?/.test(line)) {
        closeList();
        html += `<blockquote>${renderInlineMarkdown(line.replace(/^>\s?/, ""))}</blockquote>`;
        return;
      }
      const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
      if (orderedMatch) {
        if (listType !== "ol") {
          closeList();
          listType = "ol";
          html += "<ol>";
        }
        html += `<li>${renderInlineMarkdown(orderedMatch[1])}</li>`;
        return;
      }
      const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
      if (unorderedMatch) {
        if (listType !== "ul") {
          closeList();
          listType = "ul";
          html += "<ul>";
        }
        html += `<li>${renderInlineMarkdown(unorderedMatch[1])}</li>`;
        return;
      }
      closeList();
      html += `<p>${renderInlineMarkdown(line)}</p>`;
    });

    if (inCode) {
      html += `<pre class="lp-code-block"><code>${escapeHtmlText(codeLines.join("\n"))}</code></pre>`;
    }
    if (listType) {
      html += `</${listType}>`;
    }
    return html;
  }

  function updatePreview() {
    if (!previewContent) return;
    if (!isPreviewSplit) return;
    if (markdownMode) {
      previewContent.innerHTML = renderMarkdown(editor.innerText || "");
    } else {
      previewContent.innerHTML = getCleanEditorHtml();
    }
  }

  function togglePreview() {
    isPreviewSplit = !isPreviewSplit;
    editorShell?.classList.toggle("split-view", isPreviewSplit);
    previewPanel?.setAttribute("aria-hidden", isPreviewSplit ? "false" : "true");
    btnPreview?.classList.toggle("active", isPreviewSplit);
    if (isPreviewSplit) {
      updatePreview();
    }
  }

  async function toggleZenMode() {
    isZenMode = !isZenMode;
    document.body.classList.toggle("zen-mode", isZenMode);
    btnZen?.classList.toggle("active", isZenMode);
    if (api) {
      const result = await api.action("view:setFullscreen", { enabled: isZenMode });
      if (typeof result?.fullScreen === "boolean") {
        isFullScreen = result.fullScreen;
      }
    }
  }

  function updateFooterToggles() {
    const tabSize = tabSizes[tabSizeIndex];
    if (statusTabSize) {
      statusTabSize.textContent = `Tab Size: ${tabSize}`;
    }
    if (statusAutoSave) {
      statusAutoSave.textContent = `Auto-Save: ${autosaveEnabled ? "On" : "Off"}`;
    }
    if (statusEncoding) {
      statusEncoding.textContent = "UTF-8";
    }
    if (statusMarkdown) {
      statusMarkdown.innerHTML = `<i class="ri-markdown-line"></i> ${markdownMode ? "Markdown" : "Plain Text"}`;
      statusMarkdown.style.color = markdownMode ? "var(--accent-primary)" : "";
    }
  }

  function startAutosave() {
    if (!autosaveEnabled || autosaveTimer) return;
    autosaveTimer = setInterval(async () => {
      const tab = tabs.get(activeTabId);
      if (!tab || !tab.filePath || !tab.isDirty || !api) return;
      const result = await api.action("file:autoSave", {
        content: editor.innerText,
        filePath: tab.filePath
      });
      if (result && !result.canceled) {
        tab.contentHtml = editor.innerHTML;
        setTabDirty(tab, false);
      }
    }, 5000);
  }

  function stopAutosave() {
    if (autosaveTimer) {
      clearInterval(autosaveTimer);
      autosaveTimer = null;
    }
  }

  function setAutosave(enabled) {
    autosaveEnabled = enabled;
    localStorage.setItem("lp:autoSave", autosaveEnabled ? "1" : "0");
    if (autosaveEnabled) {
      startAutosave();
    } else {
      stopAutosave();
    }
    updateFooterToggles();
    if (settingsModal?.classList.contains("open")) {
      syncSettingsUI();
    }
  }

  function toggleAutosave() {
    setAutosave(!autosaveEnabled);
  }

  function setTabSize(size) {
    if (!tabSizes.includes(size)) return;
    tabSizeIndex = tabSizes.indexOf(size);
    localStorage.setItem("lp:tabSize", String(tabSizes[tabSizeIndex]));
    updateFooterToggles();
    if (settingsModal?.classList.contains("open")) {
      syncSettingsUI();
    }
  }

  function cycleTabSize() {
    const nextIndex = (tabSizeIndex + 1) % tabSizes.length;
    setTabSize(tabSizes[nextIndex]);
  }

  function toggleMarkdownMode() {
    markdownMode = !markdownMode;
    localStorage.setItem("lp:markdownMode", markdownMode ? "1" : "0");
    updateFooterToggles();
    updatePreview();
  }

  const accentThemes = {
    blue: {
      primary: "#3b82f6",
      glow: "rgba(59, 130, 246, 0.25)",
      highlightBg: "#1e293b",
      highlightText: "#60a5fa"
    },
    purple: {
      primary: "#a855f7",
      glow: "rgba(168, 85, 247, 0.25)",
      highlightBg: "#2a1f3b",
      highlightText: "#c084fc"
    },
    green: {
      primary: "#22c55e",
      glow: "rgba(34, 197, 94, 0.25)",
      highlightBg: "#1c2b22",
      highlightText: "#4ade80"
    }
  };

  function setAccentColor(themeName) {
    const theme = accentThemes[themeName];
    if (!theme) return;
    document.documentElement.style.setProperty("--accent-primary", theme.primary);
    document.documentElement.style.setProperty("--accent-glow", theme.glow);
    document.documentElement.style.setProperty("--highlight-bg", theme.highlightBg);
    document.documentElement.style.setProperty("--highlight-text", theme.highlightText);
    localStorage.setItem("lp:accentColor", themeName);
    if (settingsModal?.classList.contains("open")) {
      syncSettingsUI();
    }
  }

  function showNotification(message) {
    const toast = document.createElement("div");
    toast.className = "lp-toast";
    const duration = 2200;
    toast.innerHTML = `<span class="toast-message">${message}</span><span class="toast-progress"></span>`;
    document.body.appendChild(toast);
    const progress = toast.querySelector(".toast-progress");
    if (progress) {
      progress.style.animationDuration = `${duration}ms`;
    }
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }, duration);
  }

  function showUndoToast(message, onUndo) {
    const toast = document.createElement("div");
    toast.className = "lp-toast";
    const duration = 2800;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-action">Undo</button>
      <span class="toast-progress"></span>
    `;
    document.body.appendChild(toast);
    const undoBtn = toast.querySelector(".toast-action");
    const progress = toast.querySelector(".toast-progress");
    if (progress) {
      progress.style.animationDuration = `${duration}ms`;
    }
    const cleanup = () => {
      toast.classList.remove("show");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    };
    undoBtn?.addEventListener("click", () => {
      onUndo?.();
      cleanup();
    });
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(cleanup, duration);
  }

  function toggleFindWidget(forceVisible) {
    if (!findWidget) return;
    const isHidden = !findWidget.classList.contains("open");
    const shouldShow = typeof forceVisible === "boolean" ? forceVisible : isHidden;
    findWidget.classList.toggle("open", shouldShow);
    if (shouldShow) {
      updateFindMatches();
      findInput?.focus();
      findInput?.select();
    } else {
      clearFindHighlights();
    }
  }

  function clearFindHighlights() {
    if (!editor) return;
    const marks = editor.querySelectorAll("mark.lp-find-hit");
    marks.forEach((mark) => {
      const textNode = document.createTextNode(mark.textContent);
      const parent = mark.parentNode;
      if (!parent) return;
      parent.replaceChild(textNode, mark);
      parent.normalize();
    });
    findMatches = [];
    currentFindIndex = -1;
    updateFindCounter();
    findInput?.classList.remove("no-match");
  }

  function updateFindCounter() {
    if (!findCount) return;
    const total = findMatches.length;
    const current = total ? currentFindIndex + 1 : 0;
    findCount.textContent = `${current}/${total}`;
  }

  function setCurrentFindIndex(index, shouldScroll) {
    if (!findMatches.length) {
      currentFindIndex = -1;
      updateFindCounter();
      return;
    }
    const normalized = ((index % findMatches.length) + findMatches.length) % findMatches.length;
    findMatches.forEach((el) => el.classList.remove("lp-find-current"));
    const current = findMatches[normalized];
    current.classList.add("lp-find-current");
    current.classList.remove("lp-find-pulse");
    requestAnimationFrame(() => {
      current.classList.add("lp-find-pulse");
    });
    currentFindIndex = normalized;
    updateFindCounter();
    if (shouldScroll) {
      const behavior = prefersReducedMotion.matches ? "auto" : "smooth";
      current.scrollIntoView({ behavior, block: "center" });
    }
  }

  function collectSearchTextNodes() {
    const nodes = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest("mark.lp-find-hit")) return NodeFilter.FILTER_REJECT;
        if (parent.closest("code,pre")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      nodes.push(node);
    }
    return nodes;
  }

  function updateFindMatches() {
    if (!findInput || !editor) return;
    const query = findInput.value;
    clearFindHighlights();
    if (!query) {
      updateFindCounter();
      return;
    }
    const queryLower = query.toLowerCase();
    const nodes = collectSearchTextNodes();
    nodes.forEach((node) => {
      let currentNode = node;
      let textLower = currentNode.nodeValue.toLowerCase();
      let index = textLower.indexOf(queryLower);
      while (index !== -1) {
        const matchNode = currentNode.splitText(index);
        const afterNode = matchNode.splitText(query.length);
        const mark = document.createElement("mark");
        mark.className = "lp-find-hit";
        mark.textContent = matchNode.nodeValue;
        matchNode.parentNode.replaceChild(mark, matchNode);
        findMatches.push(mark);
        currentNode = afterNode;
        textLower = currentNode.nodeValue.toLowerCase();
        index = textLower.indexOf(queryLower);
      }
    });
    if (findMatches.length === 0) {
      findInput.classList.add("no-match");
      updateFindCounter();
      return;
    }
    findInput.classList.remove("no-match");
    setCurrentFindIndex(0, false);
  }

  function getCleanEditorHtml() {
    const clone = editor.cloneNode(true);
    clone.querySelectorAll("mark.lp-find-hit").forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });
    return clone.innerHTML;
  }

  function findNext(direction) {
    if (!findInput || !editor) return;
    if (!findInput.value) {
      clearFindHighlights();
      return;
    }
    if (!findMatches.length) {
      updateFindMatches();
    }
    if (!findMatches.length) {
      findInput.classList.add("no-match");
      updateFindCounter();
      return;
    }
    const delta = direction === "prev" ? -1 : 1;
    const nextIndex = currentFindIndex === -1 ? 0 : currentFindIndex + delta;
    setCurrentFindIndex(nextIndex, true);
  }

  function openExportDropdown(anchor) {
    if (!exportDropdown || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const shellRect = editorShell?.getBoundingClientRect() || { left: 0, top: 0 };
    const left = Math.min(rect.left - shellRect.left, window.innerWidth - 220);
    const top = rect.bottom - shellRect.top + 8;
    exportDropdown.style.left = `${Math.max(8, left)}px`;
    exportDropdown.style.top = `${Math.max(8, top)}px`;
    exportDropdown.classList.add("open");
  }

  function closeExportDropdown() {
    exportDropdown?.classList.remove("open");
  }

  function openSettingsModal() {
    if (!settingsModal) return;
    closeExportDropdown();
    settingsModal.classList.add("open");
    settingsModal.setAttribute("aria-hidden", "false");
    syncSettingsUI();
  }

  function closeSettingsModal() {
    if (!settingsModal) return;
    settingsModal.classList.remove("open");
    settingsModal.setAttribute("aria-hidden", "true");
  }

  async function openAboutModal() {
    if (!aboutModal) return;
    aboutModal.classList.add("open");
    aboutModal.setAttribute("aria-hidden", "false");
    aboutAuthor.textContent = "Author: Moroodol";
    if (api) {
      const result = await api.action("app:version");
      if (result?.version) {
        aboutVersion.textContent = `Version ${result.version}`;
      }
    }
  }

  function closeAboutModal() {
    if (!aboutModal) return;
    aboutModal.classList.remove("open");
    aboutModal.setAttribute("aria-hidden", "true");
  }

  function replaceText() {
    const findValue = prompt("Find:", findInput?.value || "");
    if (!findValue) return;
    const replaceValue = prompt("Replace with:", "");
    if (replaceValue === null) return;
    const text = editor.innerText;
    editor.innerText = text.split(findValue).join(replaceValue);
    updateStatus();
    updatePreview();
    const tab = tabs.get(activeTabId);
    if (tab) {
      tab.contentHtml = editor.innerHTML;
      setTabDirty(tab, true);
    }
  }
  function goToLine() {
    const input = prompt("Go to line:", "1");
    if (!input) return;
    const lineNumber = Math.max(1, parseInt(input, 10));
    if (Number.isNaN(lineNumber)) return;
    const text = editor.innerText;
    const lines = text.split("\n");
    const targetIndex = lines.slice(0, lineNumber - 1).join("\n").length + (lineNumber > 1 ? 1 : 0);
    const range = indexToRange(editor, targetIndex, 0);
    if (range) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      editor.focus();
      updateStatus();
    }
  }

  function indexToRange(root, index, length) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    let count = 0;
    while ((node = walker.nextNode())) {
      const nextCount = count + node.textContent.length;
      if (index <= nextCount) {
        const range = document.createRange();
        const startOffset = Math.max(0, index - count);
        range.setStart(node, startOffset);
        range.setEnd(node, Math.min(node.textContent.length, startOffset + length));
        return range;
      }
      count = nextCount;
    }
    return null;
  }

  function getSelectionIndex() {
    const range = getActiveEditorRange();
    if (!range) return 0;
    const preRange = range.cloneRange();
    preRange.selectNodeContents(editor);
    preRange.setEnd(range.endContainer, range.endOffset);
    return preRange.toString().length;
  }

  function updateStatus() {
    if (!statusLnCol || !statusChars) return;
    const text = editor.innerText || "";
    const index = getSelectionIndex();
    const before = text.slice(0, index);
    const line = before.split("\n").length;
    const col = before.length - before.lastIndexOf("\n");
    statusLnCol.textContent = `Ln ${line}, Col ${col}`;
    statusChars.textContent = `${text.length} chars`;
  }

  function closestTag(tagName, className) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    let node = selection.anchorNode;
    if (!node) return null;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }
    return node?.closest(className ? `${tagName}.${className}` : tagName);
  }

  function positionToolbar() {
    if (!toolbar) return;
    toolbar.classList.remove("is-floating");
    toolbar.style.removeProperty("position");
    toolbar.style.removeProperty("left");
    toolbar.style.removeProperty("top");
    toolbar.style.removeProperty("transform");
    toolbar.style.removeProperty("bottom");
  }

  let positionFrame = 0;
  function schedulePositionToolbar() {
    if (positionFrame) return;
    positionFrame = requestAnimationFrame(() => {
      positionFrame = 0;
      positionToolbar();
    });
  }

  function openPopover(popover, anchor) {
    if (!popover || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    popover.classList.add("open");
    const popRect = popover.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top - popRect.height - 10;
    if (top < 8) {
      top = 8;
    }
    left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8));
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function closePopover(popover) {
    popover?.classList.remove("open");
  }

  function togglePopover(popover, anchor) {
    if (!popover) return;
    if (popover.classList.contains("open")) {
      closePopover(popover);
    } else {
      openPopover(popover, anchor);
    }
  }

  function handlePopoverKeydown(event, popover) {
    if (!popover || !popover.classList.contains("open")) return false;
    const items = Array.from(popover.querySelectorAll("button"));
    if (items.length === 0) return false;
    const currentIndex = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = currentIndex === -1 ? 0 : Math.min(items.length - 1, currentIndex + 1);
      items[nextIndex].focus();
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
      items[nextIndex].focus();
      return true;
    }
    if (event.key === "Enter" && document.activeElement?.dataset?.action) {
      event.preventDefault();
      document.activeElement.click();
      return true;
    }
    return false;
  }

  function openCommandPalette() {
    if (!commandPalette || !commandInput || !commandList) return;
    saveSelection();
    commandPalette.classList.add("open");
    commandInput.value = "";
    renderCommands(commands);
    paletteIndex = 0;
    commandInput.focus();
  }

  function closeCommandPalette() {
    commandPalette?.classList.remove("open");
    editor.focus();
  }

  function renderCommands(list) {
    if (!commandList) return;
    commandFiltered = list;
    commandList.innerHTML = "";
    list.forEach((cmd, index) => {
      const item = document.createElement("div");
      item.className = "command-item";
      if (index === paletteIndex) {
        item.classList.add("active");
      }
      item.textContent = cmd.name;
      item.addEventListener("click", () => {
        restoreSelection();
        cmd.action();
        closeCommandPalette();
      });
      commandList.appendChild(item);
    });
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function saveToFile(forceSaveAs) {
    if (!api) return;
    const tab = tabs.get(activeTabId);
    if (!tab) return;
    lastSavedPath = tab.filePath || "";
    const action = forceSaveAs ? "file:saveAs" : "file:save";
    const result = await api.action(action, { content: editor.innerText, filePath: lastSavedPath });
    if (result && !result.canceled) {
      lastSavedPath = result.filePath || "";
      if (lastSavedPath) {
        localStorage.setItem("lp:lastFilePath", lastSavedPath);
      }
      tab.filePath = lastSavedPath || null;
      setTabTitle(tab, lastSavedPath.split(/[\\/]/).pop());
      setTabDirty(tab, false);
      tab.contentHtml = editor.innerHTML;
    }
  }

  async function openFile() {
    if (!api) return;
    const result = await api.action("file:open");
    if (result && !result.canceled) {
      applyOpenResult(result);
    }
  }

  async function openFileFromPath(filePath) {
    if (!api || !filePath) return false;
    const result = await api.action("file:openPath", { filePath });
    if (result && !result.canceled) {
      applyOpenResult(result);
      return true;
    }
    return false;
  }

  function applyOpenResult(result) {
    const tab = tabs.get(activeTabId);
    if (!tab) return;
    editor.innerText = result.content || "";
    tab.contentHtml = editor.innerHTML;
    tab.filePath = result.filePath || null;
    lastSavedPath = result.filePath || "";
    if (lastSavedPath) {
      localStorage.setItem("lp:lastFilePath", lastSavedPath);
      setTabTitle(tab, lastSavedPath.split(/[\\/]/).pop());
    }
    setTabDirty(tab, false);
    updateStatus();
    updatePreview();
  }

  async function runAction(name) {
    if (!name) return;
    switch (name) {
      case "file:new": {
        const tab = createTab("Untitled", "", null);
        setActiveTab(tab.id);
        return;
      }
      case "file:open":
        await openFile();
        return;
      case "file:save":
        await saveToFile(false);
        return;
      case "file:saveAs":
        await saveToFile(true);
        return;
      case "file:closeTab":
        if (activeTabId) {
          closeTab(activeTabId);
        }
        return;
      case "edit:undo":
      case "edit:redo":
      case "edit:cut":
      case "edit:copy":
      case "edit:paste":
      case "edit:selectAll":
      case "view:fullscreen":
      case "view:zoomIn":
      case "view:zoomOut":
      case "view:zoomReset":
      case "app:quit":
      case "file:exportPdf":
        if (api) {
          await api.action(name);
        }
        return;
      case "edit:find":
        toggleFindWidget();
        return;
      case "edit:replace":
        replaceText();
        return;
      case "view:wordWrap":
        toggleWordWrap();
        return;
      case "view:zen":
        toggleZenMode();
        return;
      case "go:line":
        goToLine();
        return;
      case "help:about":
        openAboutModal();
        return;
      case "help:updates":
        alert("Update checks are not wired yet.");
        return;
      default:
        return;
    }
  }

  function openMenu(index) {
    if (index < 0 || index >= menuItems.length) return;
    closeMenus();
    menuOpenIndex = index;
    menuItems[index].classList.add("open");
    const firstItem = menuItems[index].querySelector(".menu-dropdown button");
    firstItem?.focus();
  }

  function focusMenu(index) {
    if (index < 0 || index >= menuItems.length) return;
    menuFocusedIndex = index;
    menuItems.forEach((item, i) => {
      item.classList.toggle("focused", i === index);
    });
  }

  function closeMenus() {
    menuItems.forEach((item) => item.classList.remove("open", "focused"));
    menuOpenIndex = -1;
    menuFocusedIndex = -1;
  }

  function handleMenubarKeydown(event) {
    if (menuFocusedIndex === -1 && menuOpenIndex === -1) return false;
    const openMenuEl = menuOpenIndex !== -1 ? menuItems[menuOpenIndex] : null;
    const openButtons = openMenuEl ? Array.from(openMenuEl.querySelectorAll(".menu-dropdown button")) : [];
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = (menuFocusedIndex + 1) % menuItems.length;
      focusMenu(next);
      if (menuOpenIndex !== -1) openMenu(next);
      return true;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const next = (menuFocusedIndex - 1 + menuItems.length) % menuItems.length;
      focusMenu(next);
      if (menuOpenIndex !== -1) openMenu(next);
      return true;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (menuOpenIndex === -1) {
        openMenu(menuFocusedIndex);
      } else if (openButtons.length > 0) {
        const currentIndex = openButtons.indexOf(document.activeElement);
        const nextIndex = currentIndex === -1 ? 0 : Math.min(openButtons.length - 1, currentIndex + 1);
        openButtons[nextIndex].focus();
      }
      return true;
    }
    if (event.key === "ArrowUp" && menuOpenIndex !== -1) {
      event.preventDefault();
      if (openButtons.length > 0) {
        const currentIndex = openButtons.indexOf(document.activeElement);
        const nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
        openButtons[nextIndex].focus();
      }
      return true;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (menuOpenIndex === -1) {
        openMenu(menuFocusedIndex);
      } else if (document.activeElement?.dataset?.action) {
        runAction(document.activeElement.dataset.action);
        closeMenus();
      }
      return true;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenus();
      return true;
    }
    return false;
  }
  toolButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (!action) return;
      handleToolbarAction(action);
    });
  });

  headingSelector?.addEventListener("click", (event) => {
    event.stopPropagation();
    saveSelection();
    togglePopover(headingPopover, headingSelector);
  });

  headingPopover?.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  headingPopover?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    restoreSelection();
    editor.focus();
    handleToolbarAction(action);
    closePopover(headingPopover);
  });

  document.addEventListener("click", (event) => {
    if (!headingPopover?.contains(event.target) && !headingSelector?.contains(event.target)) {
      closePopover(headingPopover);
    }
    if (!menubar.contains(event.target)) {
      closeMenus();
    }
    if (commandPalette?.classList.contains("open") && !commandPalette.contains(event.target)) {
      closeCommandPalette();
    }
    if (exportDropdown?.classList.contains("open")) {
      const clickedExport = event.target.closest("#export-dropdown");
      const clickedExportBtn = event.target.closest('[data-action="export-menu"]');
      if (!clickedExport && !clickedExportBtn) {
        closeExportDropdown();
      }
    }
  });


  document.addEventListener("keydown", (event) => {
    if (handlePopoverKeydown(event, headingPopover)) return;
    if (event.key === "Escape") {
      closePopover(headingPopover);
      closeCommandPalette();
      toggleFindWidget(false);
      closeExportDropdown();
      closeSettingsModal();
      closeAboutModal();
      if (isZenMode) {
        toggleZenMode();
      } else if (isFullScreen && api) {
        api.action("view:setFullscreen", { enabled: false }).then((result) => {
          if (typeof result?.fullScreen === "boolean") {
            isFullScreen = result.fullScreen;
          }
        });
      }
    }
  });

  btnSearch?.addEventListener("click", () => {
    toggleFindWidget();
  });
  btnPreview?.addEventListener("click", () => togglePreview());
  btnZen?.addEventListener("click", () => toggleZenMode());
  btnExport?.addEventListener("click", () => {
    if (!exportDropdown) return;
    if (exportDropdown.classList.contains("open")) {
      closeExportDropdown();
    } else {
      openExportDropdown(btnExport);
    }
  });
  btnSettings?.addEventListener("click", () => {
    openSettingsModal();
  });

  exportDropdown?.addEventListener("click", async (event) => {
    const action = event.target.closest("button[data-export]")?.dataset.export;
    if (!action) return;
    closeExportDropdown();
    if (!api) return;
    if (action === "pdf") {
      await api.action("file:exportPdf");
      return;
    }
    if (action === "txt") {
      await api.action("file:exportTxt", { content: editor.innerText });
      return;
    }
    if (action === "html") {
      const htmlBody = markdownMode ? renderMarkdown(editor.innerText || "") : getCleanEditorHtml();
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>LucidPad Export</title></head><body>${htmlBody}</body></html>`;
      await api.action("file:exportHtml", { content: html });
    }
  });

  settingsClose?.addEventListener("click", () => closeSettingsModal());
  settingsModal?.addEventListener("click", (event) => {
    if (event.target === settingsModal) {
      closeSettingsModal();
    }
  });
  aboutModal?.addEventListener("click", (event) => {
    if (event.target === aboutModal) {
      closeAboutModal();
    }
  });
  aboutClose?.addEventListener("click", () => closeAboutModal());
  aboutUpdates?.addEventListener("click", () => showNotification("Update checks are not wired yet."));

  function setToggleState(toggleEl, enabled) {
    toggleEl.classList.toggle("active", enabled);
  }

  function syncSettingsUI() {
    settingsToggles.forEach((toggleEl) => {
      const key = toggleEl.dataset.setting;
      if (key === "autosave") {
        setToggleState(toggleEl, autosaveEnabled);
      }
      if (key === "wordwrap") {
        setToggleState(toggleEl, isWrap);
      }
    });
    settingsSelects.forEach((selectEl) => {
      const key = selectEl.dataset.setting;
      if (key === "tabsize") {
        selectEl.value = String(tabSizes[tabSizeIndex]);
      }
      if (key === "accent") {
        selectEl.value = localStorage.getItem("lp:accentColor") || "blue";
      }
    });
  }

  settingsToggles.forEach((toggleEl) => {
    toggleEl.addEventListener("click", () => {
      const key = toggleEl.dataset.setting;
      if (key === "autosave") {
        setAutosave(!autosaveEnabled);
        setToggleState(toggleEl, autosaveEnabled);
      }
      if (key === "wordwrap") {
        setWordWrap(!isWrap);
        localStorage.setItem("lp:wordWrap", isWrap ? "1" : "0");
        setToggleState(toggleEl, isWrap);
      }
    });
  });

  settingsSelects.forEach((selectEl) => {
    selectEl.addEventListener("change", () => {
      const key = selectEl.dataset.setting;
      if (key === "tabsize") {
        setTabSize(parseInt(selectEl.value, 10));
      }
      if (key === "accent") {
        setAccentColor(selectEl.value);
      }
    });
  });

  findInput?.addEventListener("input", () => {
    updateFindMatches();
  });

  findInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      findNext(event.shiftKey ? "prev" : "next");
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      findNext("next");
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      findNext("prev");
    }
    if (event.key === "Escape") {
      event.preventDefault();
      toggleFindWidget(false);
    }
  });

  findButtons[0]?.addEventListener("click", () => findNext("prev"));
  findButtons[1]?.addEventListener("click", () => findNext("next"));
  findButtons[2]?.addEventListener("click", () => toggleFindWidget(false));

  newTabButton?.addEventListener("click", () => runAction("file:new"));

  tabsContainer?.addEventListener("click", (event) => {
    const closeBtn = event.target.closest(".tab-close");
    const tabEl = event.target.closest(".tab");
    if (!tabEl) return;
    const tabId = tabEl.dataset.tabId;
    if (closeBtn && tabId) {
      closeTab(tabId);
      return;
    }
    if (tabId) {
      setActiveTab(tabId);
    }
  });

  editor?.addEventListener("input", () => {
    const tab = tabs.get(activeTabId);
    if (tab) {
      tab.contentHtml = editor.innerHTML;
      setTabDirty(tab, true);
    }
    updateStatus();
    updatePreview();
  });


  editor?.addEventListener("keyup", () => {
    updateStatus();
    updateToolbarStates();
    schedulePositionToolbar();
  });
  editor?.addEventListener("mouseup", () => {
    updateStatus();
    updateToolbarStates();
    schedulePositionToolbar();
  });
  document.addEventListener("selectionchange", () => {
    updateToolbarStates();
    const range = getActiveEditorRange();
    if (range) {
      savedRange = range.cloneRange();
    }
    schedulePositionToolbar();
  });

  window.addEventListener("resize", schedulePositionToolbar);

  menubar?.addEventListener("click", (event) => {
    const actionBtn = event.target.closest('.menu-dropdown [data-action]');
    if (actionBtn) {
      runAction(actionBtn.dataset.action);
      closeMenus();
      return;
    }
    const menuItem = event.target.closest('.menu-item[data-menu]');
    if (menuItem) {
      const index = menuItems.indexOf(menuItem);
      if (menuOpenIndex === index) {
        closeMenus();
      } else {
        focusMenu(index);
        openMenu(index);
      }
    }
  });

  menubar?.addEventListener("keydown", (event) => {
    handleMenubarKeydown(event);
  });

  if (commandInput) {
    commandInput.addEventListener("input", () => {
      const value = commandInput.value.toLowerCase();
      const filtered = commands.filter((cmd) => cmd.name.toLowerCase().includes(value));
      paletteIndex = 0;
      renderCommands(filtered);
    });
    commandInput.addEventListener("keydown", (event) => {
      const items = Array.from(commandList?.querySelectorAll(".command-item") || []);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        paletteIndex = Math.min(items.length - 1, paletteIndex + 1);
        renderCommands(commandFiltered);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        paletteIndex = Math.max(0, paletteIndex - 1);
        renderCommands(commandFiltered);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const selected = commandFiltered[paletteIndex] || commandFiltered[0];
        if (selected) {
          restoreSelection();
          selected.action();
        }
        closeCommandPalette();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeCommandPalette();
      }
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Alt") {
      event.preventDefault();
      focusMenu(0);
      return;
    }

    if (handleMenubarKeydown(event)) {
      return;
    }

    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "p") {
      event.preventDefault();
      openCommandPalette();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const spaces = " ".repeat(tabSizes[tabSizeIndex]);
      exec("insertText", spaces);
      return;
    }

    const key = event.key.toLowerCase();
    if (event.ctrlKey && key === "b") {
      event.preventDefault();
      if (!notepadMode) exec("bold");
    }
    if (event.ctrlKey && key === "i") {
      event.preventDefault();
      if (!notepadMode) exec("italic");
    }
    if (event.ctrlKey && key === "u") {
      event.preventDefault();
      if (!notepadMode) exec("underline");
    }
    if (event.ctrlKey && key === "k") {
      event.preventDefault();
      if (!notepadMode) {
        saveSelection();
        insertLink();
      }
    }
    if (event.ctrlKey && key === "f") {
      event.preventDefault();
      toggleFindWidget(true);
    }
    if (event.ctrlKey && key === "h") {
      event.preventDefault();
      replaceText();
    }
    if (event.ctrlKey && key === "g") {
      event.preventDefault();
      goToLine();
    }
    if (event.ctrlKey && key === "s") {
      event.preventDefault();
      if (event.shiftKey) {
        saveToFile(true);
      } else {
        saveToFile(false);
      }
    }
    if (event.ctrlKey && key === "o") {
      event.preventDefault();
      openFile();
    }
    if (event.ctrlKey && key === "n") {
      event.preventDefault();
      runAction("file:new");
    }
    if (event.ctrlKey && key === "w") {
      event.preventDefault();
      runAction("file:closeTab");
    }
    if (event.ctrlKey && key === "a") {
      event.preventDefault();
      if (notepadMode) {
        document.execCommand("selectAll");
      } else if (api) {
        api.action("edit:selectAll");
      } else {
        exec("selectAll");
      }
    }
    if (event.ctrlKey && key === "z") {
      event.preventDefault();
      if (!notepadMode) {
        if (api) {
          api.action("edit:undo");
        } else {
          exec("undo");
        }
      }
    }
    if (event.ctrlKey && key === "y") {
      event.preventDefault();
      if (!notepadMode) {
        if (api) {
          api.action("edit:redo");
        } else {
          exec("redo");
        }
      }
    }
    if (event.ctrlKey && key === "x") {
      event.preventDefault();
      if (api) {
        api.action("edit:cut");
      } else {
        exec("cut");
      }
    }
    if (event.ctrlKey && key === "c") {
      event.preventDefault();
      if (api) {
        api.action("edit:copy");
      } else {
        exec("copy");
      }
    }
    if (event.ctrlKey && key === "v") {
      event.preventDefault();
      if (api) {
        api.action("edit:paste");
      } else {
        exec("paste");
      }
    }
    if (event.ctrlKey && (event.key === "=" || event.key === "+")) {
      event.preventDefault();
      api?.action("view:zoomIn");
    }
    if (event.ctrlKey && event.key === "-") {
      event.preventDefault();
      api?.action("view:zoomOut");
    }
    if (event.ctrlKey && event.key === "0") {
      event.preventDefault();
      api?.action("view:zoomReset");
    }
    if (event.key === "F11") {
      event.preventDefault();
      api?.action("view:fullscreen").then((result) => {
        if (typeof result?.fullScreen === "boolean") {
          isFullScreen = result.fullScreen;
        }
      });
    }
  });


  statusTabSize?.addEventListener("click", () => cycleTabSize());
  statusAutoSave?.addEventListener("click", () => toggleAutosave());
  statusMarkdown?.addEventListener("click", () => toggleMarkdownMode());
  statusNotify?.addEventListener("click", () => showNotification("No new notifications."));

  function loadFooterSettings() {
    const savedTabSize = parseInt(localStorage.getItem("lp:tabSize") || "", 10);
    const savedAutoSave = localStorage.getItem("lp:autoSave");
    const savedMarkdown = localStorage.getItem("lp:markdownMode");
    const savedWrap = localStorage.getItem("lp:wordWrap");
    const savedAccent = localStorage.getItem("lp:accentColor");
    if (tabSizes.includes(savedTabSize)) {
      tabSizeIndex = tabSizes.indexOf(savedTabSize);
    }
    if (savedAutoSave === "0") {
      autosaveEnabled = false;
    }
    if (savedMarkdown === "0") {
      markdownMode = false;
    }
    if (savedWrap === "0") {
      setWordWrap(false);
    } else {
      setWordWrap(true);
    }
    if (savedAccent) {
      setAccentColor(savedAccent);
    }
    updateFooterToggles();
    if (autosaveEnabled) {
      startAutosave();
    }
    api?.action("view:getFullscreen").then((result) => {
      if (typeof result?.fullScreen === "boolean") {
        isFullScreen = result.fullScreen;
      }
    });
  }

  async function initializeTabs() {
    tabsContainer.innerHTML = "";
    tabs.clear();
    activeTabId = "";
    const lastFile = localStorage.getItem("lp:lastFilePath");
    const tab = createTab("Untitled", "", null);
    setActiveTab(tab.id);
    editor.innerHTML = "";
    if (lastFile) {
      await openFileFromPath(lastFile);
    }
    updateStatus();
  }

  async function showWhatsNewIfNeeded() {
    if (!api) return;
    const result = await api.action("app:version");
    const currentVersion = result?.version;
    if (!currentVersion) return;

    const storageKey = "lp:lastSeenVersion";
    const lastSeen = localStorage.getItem(storageKey);
    if (lastSeen === currentVersion) return;

    const title = `What's New ${currentVersion}`;
    const releaseNotes = `
      <h1>${title}</h1>
      <p>Welcome to the latest update of LucidPad.</p>
      <ol>
        <li>Improved editor stability and performance.</li>
        <li>Native menu actions wired to file and view operations.</li>
        <li>Quality-of-life shortcuts for a faster workflow.</li>
      </ol>
      <p>Thanks for using LucidPad.</p>
    `;
    const tab = createTab(title, releaseNotes, null);
    setActiveTab(tab.id);
    setTabDirty(tab, false);
    localStorage.setItem(storageKey, currentVersion);
  }

  loadFooterSettings();
  initializeTabs().then(showWhatsNewIfNeeded);
})();
