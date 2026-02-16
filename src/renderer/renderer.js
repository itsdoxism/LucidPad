
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import { icons as lucideIconSet, createElement as lucideCreateElement } from "lucide/dist/esm/lucide/src/lucide.js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

function toPascalCaseIconName(iconName) {
  return iconName
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function getLucideIconDefinition(iconName) {
  if (!iconName) return null;
  const lucideKey = toPascalCaseIconName(iconName);
  return lucideIconSet[lucideKey] || null;
}

function collectLucideIconHosts(root) {
  if (root === document) {
    return Array.from(document.querySelectorAll("[data-lucide]"));
  }
  if (!(root instanceof Element) && !(root instanceof DocumentFragment)) {
    return [];
  }
  const hosts = [];
  if (root instanceof Element && root.matches("[data-lucide]")) {
    hosts.push(root);
  }
  hosts.push(...root.querySelectorAll("[data-lucide]"));
  return hosts;
}

function renderLucideIconHost(host) {
  if (!host) return;
  const iconName = host.getAttribute("data-lucide");
  if (!iconName) return;
  const iconNode = getLucideIconDefinition(iconName);
  if (!iconNode) return;
  if (host.dataset.lpLucideIconName === iconName) return;
  host.dataset.lpLucideIconName = iconName;
  host.classList.add("lp-lucide-host");
  const svg = lucideCreateElement(iconNode, {
    width: "1em",
    height: "1em",
    stroke: "currentColor",
    fill: "none",
    "stroke-width": 1.9,
    class: "lp-lucide-icon",
    "aria-hidden": "true",
    focusable: "false"
  });
  host.replaceChildren(svg);
}

function renderLucideIcons(root = document) {
  const hosts = collectLucideIconHosts(root);
  hosts.forEach((host) => renderLucideIconHost(host));
}

function setLucideIcon(target, iconName) {
  if (!target) return;
  target.setAttribute("data-lucide", iconName);
  target.dataset.lpLucideIconName = "";
  renderLucideIconHost(target);
}

function installLucideIconAdapter() {
  const render = () => {
    renderLucideIcons(document);
  };
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", render, { once: true });
    return;
  }
  render();
}

function toReadableLabel(value) {
  if (!value) return "";
  return value
    .replace(/[-_:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function deriveButtonTooltip(button) {
  if (!button) return "";
  const fromDataTooltip = button.getAttribute("data-tooltip");
  if (fromDataTooltip) return fromDataTooltip.trim();

  const fromTitle = button.getAttribute("title");
  if (fromTitle) return fromTitle.trim();

  const fromAria = button.getAttribute("aria-label");
  if (fromAria) return fromAria.trim();

  const fromText = (button.textContent || "").replace(/\s+/g, " ").trim();
  if (fromText) return fromText;

  const action = button.dataset.action || "";
  if (action) {
    return toReadableLabel(action);
  }

  const value = button.dataset.value || "";
  if (value) {
    return toReadableLabel(value);
  }

  const iconHost = button.querySelector("[data-lucide]");
  if (iconHost?.getAttribute("data-lucide")) {
    return toReadableLabel(iconHost.getAttribute("data-lucide"));
  }

  return "";
}

function ensureButtonTooltips(root = document) {
  if (!root) return;
  const buttons = [];
  if (root instanceof HTMLButtonElement) {
    buttons.push(root);
  } else if (root instanceof Element || root instanceof DocumentFragment || root === document) {
    buttons.push(...root.querySelectorAll("button"));
  } else {
    return;
  }

  buttons.forEach((button) => {
    if (button.hasAttribute("data-no-tooltip")) {
      button.removeAttribute("data-tooltip");
      button.removeAttribute("title");
      return;
    }
    const currentTooltip = button.getAttribute("data-tooltip");
    if (currentTooltip && currentTooltip.trim()) {
      button.removeAttribute("title");
      return;
    }
    const tooltip = deriveButtonTooltip(button);
    if (tooltip) {
      button.setAttribute("data-tooltip", tooltip);
    }
    button.removeAttribute("title");
  });
}

function installButtonTooltipAdapter() {
  const apply = () => {
    ensureButtonTooltips(document);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          ensureButtonTooltips(mutation.target);
          return;
        }
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element || node instanceof DocumentFragment) {
            ensureButtonTooltips(node);
          }
        });
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["title", "aria-label", "data-action", "data-value", "data-tooltip"]
    });
  };

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", apply, { once: true });
    return;
  }
  apply();
}

(() => {
  const editor = document.querySelector(".editor-area");
  const editorScroll = document.querySelector(".editor-scroll");
  const lineHighlight = document.querySelector("[data-line-highlight]");
  const plainEditorWrap = document.querySelector("[data-plain-editor]");
  const plainScroll = document.querySelector("[data-plain-scroll]");
  const plainCanvas = document.querySelector("[data-plain-canvas]");
  const plainSpacer = document.querySelector("[data-plain-spacer]");
  const plainInput = document.querySelector("[data-plain-input]");
  const editorShell = document.querySelector(".editor-shell");
  const outlinePanel = document.querySelector(".outline-panel");
  const outlineResizer = document.querySelector("[data-outline-resizer]");
  const outlineList = outlinePanel?.querySelector("[data-outline-list]");
  const backlinksList = outlinePanel?.querySelector("[data-backlinks-list]");
  const tagChips = outlinePanel?.querySelector("[data-tag-chips]");
  const noteWords = outlinePanel?.querySelector("[data-note-words]");
  const noteChars = outlinePanel?.querySelector("[data-note-chars]");
  const noteReading = outlinePanel?.querySelector("[data-note-reading]");
  const noteUpdated = outlinePanel?.querySelector("[data-note-updated]");
  const tabsContainer = document.querySelector(".tabs");
  const tabsViewport = document.querySelector(".tabs-viewport");
  const tabsArrowLeft = document.querySelector(".tabs-arrow-left");
  const tabsArrowRight = document.querySelector(".tabs-arrow-right");
  const tabsFadeLeft = document.querySelector(".tabs-fade.left");
  const tabsFadeRight = document.querySelector(".tabs-fade.right");
  const newTabButton = document.querySelector('.tabs-container .icon-btn[title="New Tab"]');
  const findWidget = document.querySelector(".find-widget");
  const findInput = document.querySelector(".find-input");
  const findButtons = findWidget ? findWidget.querySelectorAll(".icon-btn") : [];
  const findCount = findWidget ? findWidget.querySelector(".find-count") : null;
  installLucideIconAdapter();
  installButtonTooltipAdapter();

  let tiptapEditor = null;
  const isTipTapActive = () => !!tiptapEditor;

  const btnSearch = document.querySelector('.header-actions .icon-btn[data-action="search"]');
  const btnPreview = document.querySelector('.header-actions .icon-btn[data-action="preview-toggle"]');
  const btnZen = document.querySelector('.header-actions .icon-btn[data-action="zen-toggle"]');
  const btnSettings = document.querySelector('.header-actions .icon-btn[data-action="settings-open"]');
  const settingsModal = document.getElementById("settings-modal");
  const settingsClose = settingsModal?.querySelector('[data-action="settings-close"]');
  const settingsToggles = settingsModal ? Array.from(settingsModal.querySelectorAll(".toggle[data-setting]")) : [];
  const settingsSelects = settingsModal ? Array.from(settingsModal.querySelectorAll("select[data-setting]")) : [];
  const onboardModal = document.getElementById("onboard-modal");
  const onboardSteps = onboardModal ? Array.from(onboardModal.querySelectorAll("[data-onboard-step]")) : [];
  const onboardButtons = onboardModal ? Array.from(onboardModal.querySelectorAll("[data-onboard-action]")) : [];
  const onboardLangOptions = onboardModal ? Array.from(onboardModal.querySelectorAll("[data-onboard-language]")) : [];
  const onboardAccentOptions = onboardModal ? Array.from(onboardModal.querySelectorAll("[data-onboard-accent]")) : [];
  const welcomeModal = document.getElementById("welcome-modal");
  const welcomeButtons = welcomeModal ? Array.from(welcomeModal.querySelectorAll("[data-welcome-action]")) : [];
  const tourOverlay = document.getElementById("tour-overlay");
  const tourHighlight = tourOverlay?.querySelector("[data-tour-highlight]");
  const tourCard = tourOverlay?.querySelector("[data-tour-card]");
  const tourTitle = tourOverlay?.querySelector("[data-tour-title]");
  const tourDesc = tourOverlay?.querySelector("[data-tour-desc]");
  const tourProgress = tourOverlay?.querySelector("[data-tour-progress]");
  const tourButtons = tourOverlay ? Array.from(tourOverlay.querySelectorAll("[data-tour-action]")) : [];
  const aboutModal = document.getElementById("about-modal");
  const aboutClose = aboutModal?.querySelector('[data-action="about-close"]');
  const aboutUpdates = aboutModal?.querySelector('[data-action="about-updates"]');
  const aboutVersion = aboutModal?.querySelector("[data-about-version]");
  const aboutAuthor = aboutModal?.querySelector("[data-about-author]");
  const downloadOverlay = document.getElementById("download-overlay");
  const downloadFilename = downloadOverlay?.querySelector("[data-download-filename]");
  const downloadBadge = downloadOverlay?.querySelector("[data-download-badge]");
  const downloadIcon = downloadOverlay?.querySelector("[data-download-icon]");
  const downloadBar = downloadOverlay?.querySelector("[data-download-bar]");
  const downloadPercent = downloadOverlay?.querySelector("[data-download-percent]");
  const downloadStats = downloadOverlay?.querySelector("[data-download-stats]");
  const downloadSpeed = downloadOverlay?.querySelector("[data-download-speed]");
  const downloadSteps = downloadOverlay ? Array.from(downloadOverlay.querySelectorAll("[data-download-step]")) : [];
  const downloadButtons = downloadOverlay ? Array.from(downloadOverlay.querySelectorAll("[data-download-action]")) : [];
  const updateModal = document.getElementById("update-modal");
  const updateVersionText = updateModal?.querySelector("[data-update-version]");
  const updateButtons = updateModal ? Array.from(updateModal.querySelectorAll("[data-update-action]")) : [];
  const changelogModal = document.getElementById("changelog-modal");
  const changelogSearch = changelogModal?.querySelector("[data-changelog-search]");
  const changelogList = changelogModal?.querySelector("[data-changelog-list]");
  const changelogTitle = changelogModal?.querySelector("[data-changelog-title]");
  const changelogDate = changelogModal?.querySelector("[data-changelog-date]");
  const changelogBody = changelogModal?.querySelector("[data-changelog-body]");
  const changelogButtons = changelogModal ? Array.from(changelogModal.querySelectorAll("[data-changelog-action]")) : [];
  const activityBell = document.querySelector("[data-activity-bell]");
  const activityBadge = document.querySelector("[data-activity-badge]");
  const activityPanel = document.getElementById("activity-panel");
  const activityList = activityPanel?.querySelector("[data-activity-list]");
  const saveModal = document.getElementById("save-modal");
  const saveMessage = saveModal?.querySelector("[data-save-message]");
  const saveButtons = saveModal ? Array.from(saveModal.querySelectorAll("[data-save-action]")) : [];
  const formatModal = document.getElementById("format-modal");
  const formatButtons = formatModal ? Array.from(formatModal.querySelectorAll("[data-format-action]")) : [];
  const missingFileModal = document.getElementById("missing-file-modal");
  const missingFileMessage = missingFileModal?.querySelector("[data-missing-message]");
  const missingFileButtons = missingFileModal ? Array.from(missingFileModal.querySelectorAll("[data-missing-action]")) : [];
  const trashPage = document.querySelector("[data-trash-page]");
  const trashList = trashPage?.querySelector("[data-trash-list]");
  const trashButtons = trashPage ? Array.from(trashPage.querySelectorAll("[data-trash-action]")) : [];
  const spellMenu = document.getElementById("spell-menu");
  const spellItems = spellMenu?.querySelector("[data-spell-items]");
  const viewModeExitBtn = document.querySelector('[data-action="zen-exit"]');
  const settingsPage = document.querySelector("[data-settings-page]");
  const settingsBack = settingsPage?.querySelector(".settings-back");
  const settingsDropdowns = settingsPage ? Array.from(settingsPage.querySelectorAll("[data-settings-dropdown]")) : [];
  const settingsAutoUpdateToggle = settingsPage?.querySelector('input[data-setting="auto-update"]');
  const settingsAutoSaveToggle = settingsPage?.querySelector('input[data-setting="autosave"]');
  const settingsWordWrapToggle = settingsPage?.querySelector('input[data-setting="wordwrap"]');
  const settingsSpellcheckToggle = settingsPage?.querySelector('input[data-setting="spellcheck"]');
  const settingsPlainModeToggle = settingsPage?.querySelector('input[data-setting="plain-mode"]');
  const settingsLineHighlightToggle = settingsPage?.querySelector('input[data-setting="line-highlight"]');
  const settingsBlurToggle = settingsPage?.querySelector('input[data-setting="blur-effects"]');
  const settingsAdaptiveVibeToggle = settingsPage?.querySelector('input[data-setting="adaptive-vibe"]');
  const settingsReduceMotionToggle = settingsPage?.querySelector('input[data-setting="reduce-motion"]');
  const settingsConfirmOverwriteToggle = settingsPage?.querySelector('input[data-setting="confirm-overwrite"]');
  const settingsExportFolderInput = settingsPage?.querySelector('input[data-setting="export-folder"]');
  const settingsUpdateNotificationsToggle = settingsPage?.querySelector('input[data-setting="update-notifications"]');
  const settingsErrorToastsToggle = settingsPage?.querySelector('input[data-setting="error-toasts"]');
  const settingsBackgroundPickButton = settingsPage?.querySelector('[data-setting="background-image-pick"]');
  const settingsBackgroundExampleButton = settingsPage?.querySelector('[data-setting="background-image-example"]');
  const settingsBackgroundClearButton = settingsPage?.querySelector('[data-setting="background-image-clear"]');
  const settingsBackgroundDimRange = settingsPage?.querySelector('input[data-setting="background-image-dim"]');
  const settingsBackgroundBlurRange = settingsPage?.querySelector('input[data-setting="background-image-blur"]');
  const settingsBackgroundDimValue = settingsPage?.querySelector("[data-bg-dim-value]");
  const settingsBackgroundBlurValue = settingsPage?.querySelector("[data-bg-blur-value]");
  const settingsBackgroundPreview = settingsPage?.querySelector("[data-bg-preview]");
  const settingsBackgroundPreviewVideo = settingsPage?.querySelector("[data-bg-preview-video]");
  const settingsBackgroundPreviewCaption = settingsPage?.querySelector("[data-bg-preview-caption]");
  const settingsAdaptiveAccentPreview = settingsPage?.querySelector("[data-adaptive-accent-preview]");
  const settingsAdaptiveAccentValue = settingsPage?.querySelector("[data-adaptive-accent-value]");
  const settingsAdaptiveAccentButton = settingsPage?.querySelector('[data-setting="adaptive-accent-suggest"]');
  const settingsAccentChips = settingsPage ? Array.from(settingsPage.querySelectorAll(".settings-chip[data-accent]")) : [];
  const settingsStartupToggle = settingsPage?.querySelector('input[data-setting="startup"]');
  const settingsWelcomeTourButton = settingsPage?.querySelector('[data-setting="welcome-tour"]');
  const settingsResetButton = settingsPage?.querySelector('[data-action="settings-reset"]');
  let missingFileTabId = "";

  const statusRight = document.querySelectorAll("footer .footer-right .status-item");
  const statusLnCol = statusRight[0];
  const statusChars = statusRight[1];
  const statusNotify = statusRight[2];
  const statusLeft = document.querySelectorAll("footer .footer-left .status-item");
  const statusBranch = document.querySelector("[data-branch-status]");
  const statusAutoSave = statusLeft[1];
  const statusEncoding = statusLeft[2];
  const statusSession = document.querySelector("[data-session-time]");

  const menubar = document.querySelector(".menubar");
  const appLogo = document.querySelector(".app-logo");
  const appBackgroundVideo = document.querySelector("[data-app-bg-video]");
  const menuItems = Array.from(document.querySelectorAll('.menubar .menu-item[data-menu]'));
  const windowMaximizeButton = document.querySelector("[data-window-max-btn]");

  const toolbar = document.querySelector(".floating-toolbar");
  const headingSelector = document.querySelector(".floating-toolbar .font-selector:not(.list-selector)");
  const listSelector = document.querySelector(".list-selector");
  const toolbarPrimary = toolbar?.querySelector("[data-toolbar-group=\"primary\"]");
  const toolbarBlockMenu = toolbar?.querySelector("[data-dropdown-menu=\"block\"]");
  const toolbarBlockTrigger = toolbar?.querySelector("[data-dropdown-trigger=\"block\"]");
  const toolbarAlignMenu = toolbar?.querySelector("[data-dropdown-menu=\"align\"]");
  const toolbarAlignTrigger = toolbar?.querySelector("[data-dropdown-trigger=\"align\"]");
  const toolbarMoreMenu = toolbar?.querySelector("[data-dropdown-menu=\"more\"]");
  const toolbarMoreTrigger = toolbar?.querySelector("[data-dropdown-trigger=\"more\"]");
  let toolButtons = [];
  const bubbleMenu = document.getElementById("tiptap-bubble");
  const bubbleButtons = bubbleMenu ? Array.from(bubbleMenu.querySelectorAll("[data-action]")) : [];
  const colorInputs = Array.from(document.querySelectorAll(".floating-toolbar .color-input"));
  const colorDots = Array.from(document.querySelectorAll(".floating-toolbar [data-color-dot]"));

  const headingPopover = document.getElementById("heading-popover");
  const listPopover = document.getElementById("list-popover");
  const commandPalette = document.getElementById("command-palette");
  const commandInput = commandPalette?.querySelector("input");
  const commandList = commandPalette?.querySelector(".command-list");

  const api = window.lp || null;
  let isWrap = true;
  let lastSavedPath = "";
  let tabCounter = 1;
  let activeTabId = "";
  const tabs = new Map();
  let autosaveEnabled = true;
  let autosaveTimer = null;
  let autosaveIntervalMs = 5000;
  let markdownMode = true;
  const notepadMode = false;
  let isSidePanelOpen = false;
  let isZenMode = false;
  let isFullScreen = false;
  let isPlainMode = false;
  let isLineHighlightEnabled = false;
  let confirmOverwriteEnabled = true;
  let updateNotificationsEnabled = true;
  let errorToastsEnabled = true;
  let plainEditorInstance = null;
  let editorZoom = 1;
  let baseEditorFontSize = 16;
  let baseEditorLineHeight = 22;
  let backgroundImageData = "";
  let backgroundMediaType = "";
  let backgroundVideoSource = "";
  let backgroundVideoPath = "";
  let backgroundVideoObjectUrl = "";
  let backgroundImageDim = 55;
  let backgroundImageBlur = 0;
  let adaptiveVibeEnabled = false;
  let adaptiveVibeVideoTimer = 0;
  let adaptiveVibeSampleToken = 0;
  let adaptiveVibeStyleEl = null;
  let adaptiveSuggestedAccentHex = "";
  const BUILTIN_BG_VIDEO_PREFIX = "builtin:";
  const BUILTIN_BG_VIDEO_FILE = "98763123.mp4";
  const DEFAULT_THEME_NEUTRALS = Object.freeze({
    bg: "#0f0f11",
    border: "#27272a",
    muted: "#a1a1aa"
  });
  const ADAPTIVE_SAMPLE_SIZE = 48;
  const adaptiveSampleCanvas = document.createElement("canvas");
  adaptiveSampleCanvas.width = ADAPTIVE_SAMPLE_SIZE;
  adaptiveSampleCanvas.height = ADAPTIVE_SAMPLE_SIZE;
  const adaptiveSampleCtx = adaptiveSampleCanvas.getContext("2d", { willReadFrequently: true });
  const SIDE_PANEL_MIN_WIDTH = 240;
  const SIDE_PANEL_MAX_WIDTH = 560;
  const MIN_EDITOR_CONTENT_WIDTH = 560;
  let currentLanguage = "English";
  const SUPPORTED_LANGUAGES = Object.freeze(["English", "Mongolian", "Japanese"]);
  const LANGUAGE_LABELS = Object.freeze({
    English: "English",
    Mongolian: "Монгол",
    Japanese: "日本語"
  });
  const LANGUAGE_HTML_LANG = Object.freeze({
    English: "en",
    Mongolian: "mn",
    Japanese: "ja"
  });
  let suppressSettingsDropdownAction = false;
  let onboardStep = "language";

  let menuOpenIndex = -1;
  let menuFocusedIndex = -1;
  let savedRange = null;
  let paletteIndex = 0;
  let findMatches = [];
  let currentFindIndex = -1;
  let lastClosedTab = null;
  let activeDownloadId = null;
  let activeDownloadPath = "";
  let downloadPaused = false;
  let downloadStage = "downloading";
  let downloadMode = "file";
  let pendingUpdateVersion = "";
  let changelogData = {};
  let changelogVersions = [];
  let activeChangelogVersion = "";
  let activities = [];
  let lastAutosaveStatus = "";
  let saveDialogResolver = null;
  let formatDialogResolver = null;
  const customScrollbars = new Map();
  let trashItems = [];
  const sessionStart = Date.now();
  let sessionTimer = null;
  let appVersionCache = "";
  let tourSteps = [];
  let tourIndex = -1;
  let tourAnchor = null;
  let tourLastIndex = -1;
  let tourHistory = [];
  const forcedInlineState = {
    bold: false,
    italic: false,
    underline: false
  };

  const TOOL_DEFS = [
    { action: "bold", labelKey: "toolbar.bold", icon: "bold", group: "primary", context: "selection" },
    { action: "italic", labelKey: "toolbar.italic", icon: "italic", group: "primary", context: "selection" },
    { action: "underline", labelKey: "toolbar.underline", icon: "underline", group: "primary", context: "selection" },
    { action: "strike", labelKey: "toolbar.strike", icon: "strikethrough", group: "primary", context: "selection" },
    { action: "code", labelKey: "toolbar.code", icon: "code-xml", group: "primary", context: "selection" },
    { action: "highlight", labelKey: "toolbar.highlight", icon: "highlighter", group: "primary", context: "selection" },
    { action: "undo", labelKey: "toolbar.undo", icon: "undo-2", group: "primary", context: "always" },
    { action: "redo", labelKey: "toolbar.redo", icon: "redo-2", group: "primary", context: "always" },

    { action: "align-left", labelKey: "toolbar.alignLeft", icon: "align-left", group: "align", context: "always" },
    { action: "align-center", labelKey: "toolbar.alignCenter", icon: "align-center", group: "align", context: "always" },
    { action: "align-right", labelKey: "toolbar.alignRight", icon: "align-right", group: "align", context: "always" },

    { action: "format:body", labelKey: "toolbar.body", icon: "type", group: "block", context: "always" },
    { action: "format:title", labelKey: "toolbar.title", text: "H1", group: "block", context: "always" },
    { action: "format:subtitle", labelKey: "toolbar.subtitle", text: "H2", group: "block", context: "always" },
    { action: "format:heading", labelKey: "toolbar.heading", text: "H3", group: "block", context: "always" },
    { action: "blockquote", labelKey: "toolbar.blockquote", icon: "quote", group: "block", context: "always" },
    { action: "horizontal-rule", labelKey: "toolbar.horizontalRule", icon: "minus", group: "block", context: "always" },
    { action: "list:bullet", labelKey: "toolbar.bulletList", icon: "list", group: "block", context: "always" },
    { action: "list:number", labelKey: "toolbar.numberedList", icon: "list-ordered", group: "block", context: "always" },
    { action: "table", labelKey: "toolbar.table", icon: "table-2", group: "block", context: "always" },
    { action: "table:add-row", labelKey: "toolbar.addRow", text: "R+", group: "block", context: "table" },
    { action: "table:add-col", labelKey: "toolbar.addColumn", text: "C+", group: "block", context: "table" },
    { action: "table:delete", labelKey: "toolbar.deleteTable", icon: "trash-2", group: "block", context: "table" },
    { action: "subscript", labelKey: "toolbar.subscript", icon: "subscript", group: "more", context: "selection" },
    { action: "superscript", labelKey: "toolbar.superscript", icon: "superscript", group: "more", context: "selection" },
    { action: "text-color", labelKey: "toolbar.textColor", icon: "palette", group: "more", context: "selection" },
    { action: "highlight-color", labelKey: "toolbar.highlightColor", icon: "paint-bucket", group: "more", context: "selection" },

    { action: "clear", labelKey: "toolbar.clearFormatting", icon: "remove-formatting", group: "more", context: "always" },
    { action: "word-wrap", labelKey: "toolbar.wordWrap", icon: "wrap-text", group: "more", context: "always" }
  ];

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const commands = [
    { name: "Bold", action: () => exec("bold") },
    { name: "Italic", action: () => exec("italic") },
    { name: "Heading 1", action: () => formatBlock("H1") },
    { name: "Heading 2", action: () => formatBlock("H2") },
    { name: "Heading 3", action: () => formatBlock("H3") }
  ];
  let commandFiltered = commands;

  async function initTipTapEditor() {
    if (!editor) return;
    try {
      tiptapEditor = new Editor({
        element: editor,
        content: editor.innerHTML || "<p></p>",
        extensions: [
          StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] }, codeBlock: false }),
          TextStyle,
          Color,
          Highlight.configure({ multicolor: true }),
          ...(bubbleMenu
            ? [
                BubbleMenu.configure({
                  element: bubbleMenu,
                  tippyOptions: {
                    duration: 120,
                    moveTransition: "transform 120ms ease-out"
                  },
                  shouldShow: ({ editor: viewEditor }) => {
                    return viewEditor.isFocused && !viewEditor.state.selection.empty;
                  }
                })
              ]
            : []),
          Underline,
          Link.configure({ openOnClick: false }),
          TextAlign.configure({ types: ["heading", "paragraph"] }),
          Subscript,
          Superscript,
          Table.configure({ resizable: true }),
          TableRow,
          TableHeader,
          TableCell
        ],
        editorProps: {
          attributes: {
            spellcheck: editor.getAttribute("spellcheck") || "false"
          }
        },
        onUpdate: () => {
          editor.dispatchEvent(new Event("input"));
        },
        onSelectionUpdate: () => {
          updateToolbarStates();
        }
      });
      if (!tiptapEditor?.isEditable) {
        throw new Error("TipTap editor not editable");
      }
      editor.dataset.richText = "tiptap";
    } catch (error) {
      console.error("Failed to initialize TipTap", error);
      editor.setAttribute("contenteditable", "true");
      editor.dataset.richText = "fallback";
    }
  }

  function saveSelection() {
    if (isTipTapActive()) return;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        savedRange = range.cloneRange();
      }
    }
  }

  function restoreSelection() {
    if (isTipTapActive()) {
      focusEditor();
      return;
    }
    if (!savedRange) return;
    if (!editor || !editor.contains(savedRange.commonAncestorContainer)) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
  }
  function getSavedEditorRange() {
    if (!savedRange || !editor || !editor.contains(savedRange.commonAncestorContainer)) return null;
    return savedRange;
  }
  function restoreEditorFocusAfterAction() {
    if (!editor) return;
    if (isTipTapActive()) {
      focusEditor();
      return;
    }
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      const range = getActiveEditorRange() || getSavedEditorRange() || ensureEditableLine(null);
      if (selection && range) {
        selection.removeAllRanges();
        selection.addRange(range);
        savedRange = range.cloneRange();
      }
      editor.focus();
    });
  }
  function ensureEditorSelection() {
    if (isTipTapActive()) {
      focusEditor();
      return null;
    }
    const selection = window.getSelection();
    let range = getActiveEditorRange();
    if (range) return range;
    range = ensureEditableLine(null);
    if (!selection || !range) return null;
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
    return range;
  }

  function setCustomCaretVisible(_visible) {}

  function updateCustomCaret() {}

  function refreshCaretBlink() {}

  function getEditorHTML() {
    if (tiptapEditor) {
      return tiptapEditor.getHTML();
    }
    return editor.innerHTML;
  }

  function getEditorText() {
    if (tiptapEditor) {
      return tiptapEditor.getText();
    }
    return editor.innerText || "";
  }

  function setEditorText(text) {
    if (tiptapEditor) {
      const normalized = (text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      const lines = normalized.split("\n");
      const content = lines.map((line) =>
        line
          ? { type: "paragraph", content: [{ type: "text", text: line }] }
          : { type: "paragraph" }
      );
      tiptapEditor.commands.setContent({ type: "doc", content }, false);
      return;
    }
    editor.innerText = text || "";
  }

  function plainTextToHtml(text) {
    const normalized = (text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (!normalized) return "";
    return normalized
      .split("\n")
      .map((line) => (line.length ? `<p>${escapeHtml(line)}</p>` : "<p><br></p>"))
      .join("");
  }

  function setEditorHTML(html) {
    if (tiptapEditor) {
      tiptapEditor.commands.setContent(html || "<p></p>", false);
      return;
    }
    editor.innerHTML = html || "";
  }

  function focusEditor() {
    if (tiptapEditor) {
      tiptapEditor.chain().focus().run();
      return;
    }
    editor.focus();
  }

  function getActiveEditorRange() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        return range;
      }
    }
    if (!isTipTapActive() && savedRange && editor.contains(savedRange.commonAncestorContainer)) {
      return savedRange;
    }
    return null;
  }

  function getCaretOffsetInEditor() {
    if (!editor) return null;
    if (isTipTapActive()) {
      return tiptapEditor.state.selection.from;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.startContainer)) return null;
    const preRange = range.cloneRange();
    preRange.selectNodeContents(editor);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
  }

  function setCaretOffsetInEditor(offset) {
    if (!editor) return;
    if (isTipTapActive()) {
      tiptapEditor.commands.setTextSelection(Math.max(0, offset || 0));
      tiptapEditor.chain().focus().run();
      return;
    }
    const selection = window.getSelection();
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    let remaining = Math.max(0, offset);
    let node = walker.nextNode();
    while (node) {
      const textLength = node.textContent?.length || 0;
      if (remaining <= textLength) {
        const range = document.createRange();
        range.setStart(node, remaining);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        return;
      }
      remaining -= textLength;
      node = walker.nextNode();
    }
    moveCaretToEnd(editor);
  }

  function createTab(title, contentHtml, filePath, options = {}) {
    const order = Number.isFinite(options.order) ? options.order : tabCounter;
    tabCounter = Math.max(tabCounter, order + 1);
    const id = `tab-${order}`;
    const contentText = typeof options.contentText === "string"
      ? options.contentText
      : htmlToPlainText(contentHtml || "");
    const tab = {
      id,
      title: title || t("tab.untitled"),
      filePath: filePath || null,
      order,
      missingPath: false,
      missingNotified: false,
      encoding: options.encoding || "UTF-8",
      isDirty: false,
      contentHtml: contentHtml || "",
      contentText
    };
    tabs.set(id, tab);
    const tabEl = document.createElement("div");
    tabEl.className = "tab";
    tabEl.dataset.tabId = id;
    tabEl.innerHTML = `
      <span class="tab-title">${tab.title}</span>
      <i class="tab-close" data-lucide="x"></i>
    `;
    renderLucideIcons(tabEl);
    tabsContainer.appendChild(tabEl);
    tabEl.classList.add("tab-enter");
    requestAnimationFrame(() => {
      tabEl.classList.remove("tab-enter");
    });
    persistTabs();
    updateTabScrollUI();
    return tab;
  }

  function setTabTitle(tab, title) {
    if (!tab || !title) return;
    tab.title = title;
    const tabEl = getTabEl(tab.id);
    const label = tabEl?.querySelector(".tab-title");
    if (label) {
      label.textContent = title;
    }
  }

  function reorderTabs() {
    const ordered = Array.from(tabs.values()).sort((a, b) => a.order - b.order);
    ordered.forEach((tab) => {
      const tabEl = getTabEl(tab.id);
      if (tabEl) {
        tabsContainer.appendChild(tabEl);
      }
    });
  }

  function updateTabScrollUI() {
    if (!tabsContainer || !tabsViewport) return;
    const maxScroll = tabsContainer.scrollWidth - tabsContainer.clientWidth;
    const atStart = tabsContainer.scrollLeft <= 0;
    const atEnd = tabsContainer.scrollLeft >= maxScroll - 1;
    tabsFadeLeft?.classList.toggle("is-visible", !atStart);
    tabsFadeRight?.classList.toggle("is-visible", !atEnd);
    tabsArrowLeft?.classList.toggle("is-disabled", atStart);
    tabsArrowRight?.classList.toggle("is-disabled", atEnd);
    updateTabDensity();
  }

  function updateTabDensity() {
    if (!tabsContainer || !tabsViewport) return;
    const needsDense = tabsContainer.scrollWidth > tabsViewport.clientWidth * 1.05 || tabs.size > 7;
    tabsContainer.classList.toggle("dense", needsDense);
    tabsContainer.classList.toggle("normal", !needsDense);
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

  function deriveTabTitleFromContent(html) {
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    const rawText = (doc.body?.textContent || "").replace(/\u00a0/g, " ").trim();
    const text = rawText.replace(/\s+/g, " ").trim();
    if (!text) return t("tab.untitled");
    const maxLen = 24;
    const trimmed = text.length > maxLen ? `${text.slice(0, maxLen - 3)}...` : text;
    return trimmed;
  }

  function deriveTabTitleFromText(text) {
    const cleaned = (text || "").replace(/\s+/g, " ").trim();
    if (!cleaned) return t("tab.untitled");
    const maxLen = 24;
    return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 3)}...` : cleaned;
  }

  function sanitizeFileName(name) {
    const cleaned = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
    const trimmed = cleaned.replace(/[. ]+$/g, "");
    return trimmed || t("tab.untitled");
  }

  function getSuggestedFileName(tab, preferredExt) {
    const baseName = tab?.filePath ? tab.filePath.split(/[\\/]/).pop() : tab?.title || t("tab.untitled");
    const safeName = sanitizeFileName(baseName);
    if (/\.[A-Za-z0-9]{1,6}$/.test(safeName)) {
      return safeName;
    }
    const ext = preferredExt === "md" ? "md" : "txt";
    return `${safeName}.${ext}`;
  }

  function hasRichFormatting(html) {
    const content = typeof html === "string" ? html : "";
    if (!content.trim()) return false;
    const doc = new DOMParser().parseFromString(content, "text/html");
    const body = doc.body;
    const richTags = new Set([
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "STRONG",
      "B",
      "EM",
      "I",
      "U",
      "UL",
      "OL",
      "LI",
      "A",
      "BLOCKQUOTE",
      "CODE",
      "PRE",
      "HR",
      "IMG",
      "TABLE",
      "THEAD",
      "TBODY",
      "TR",
      "TD",
      "TH"
    ]);
    const stylePattern = /font-weight|font-style|text-decoration|text-align|color|background|font-size|line-height/i;
    const isFormattingElement = (el) => {
      if (richTags.has(el.tagName)) return true;
      if (el.tagName === "MARK" && el.classList.contains("lp-find-hit")) return false;
      if (el.hasAttribute("style")) {
        return stylePattern.test(el.getAttribute("style") || "");
      }
      return false;
    };
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT, null);
    let node = walker.currentNode;
    while (node) {
      const el = node;
      if (isFormattingElement(el)) return true;
      node = walker.nextNode();
    }
    return false;
  }

  function getTabEl(id) {
    return tabsContainer.querySelector(`.tab[data-tab-id="${id}"]`);
  }

  function persistActiveTab() {
    const tab = tabs.get(activeTabId);
    if (!tab) return;
    if (isPlainMode && plainEditorInstance) {
      tab.contentText = plainEditorInstance.getText();
      tab.plainCursor = plainEditorInstance.getCursorPosition();
    } else {
      tab.contentHtml = getEditorHTML();
      tab.contentText = htmlToPlainText(tab.contentHtml);
      tab.caretOffset = getCaretOffsetInEditor();
    }
    persistTabs();
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
    if (isPlainMode && plainEditorInstance) {
      const text = tab.contentText || htmlToPlainText(tab.contentHtml || "");
      plainEditorInstance.setText(text);
      tab.contentText = text;
      if (tab.plainCursor) {
        plainEditorInstance.setCursorPosition(tab.plainCursor.line, tab.plainCursor.col);
      } else {
        plainEditorInstance.setCursorPosition(0, 0);
      }
      plainEditorInstance.focus();
    } else {
      setEditorHTML(tab.contentHtml || "");
      focusEditor();
      const offset = Number.isFinite(tab.caretOffset) ? tab.caretOffset : null;
      requestAnimationFrame(() => {
        if (offset !== null) {
          setCaretOffsetInEditor(offset);
        } else {
          moveCaretToEnd(editor);
        }
        scheduleCustomCaretUpdate();
        refreshCaretBlink();
      });
    }
    lastSavedPath = tab.filePath || "";
    updateStatus();
    updatePreview();
    updateFooterToggles();
    persistTabs();
    showMissingIfNeeded(tab);
  }

  function removeWithTransition(el) {
    if (!el) return;
    if (document.body.classList.contains("reduce-motion")) {
      el.remove();
      return;
    }
    el.addEventListener("transitionend", () => el.remove(), { once: true });
  }

  function getTabContentText(tab) {
    if (!tab) return "";
    const fromText = typeof tab.contentText === "string" ? tab.contentText : "";
    const fromHtml = typeof tab.contentHtml === "string" ? htmlToPlainText(tab.contentHtml) : "";
    return (fromText || fromHtml)
      .replace(/\u00a0/g, " ")
      .replace(/\u200B/g, "")
      .trim();
  }

  async function closeTab(id) {
    const tabEl = getTabEl(id);
    const wasActive = id === activeTabId;
    const tab = tabs.get(id);
    const tabText = getTabContentText(tab);
    if (tab?.isDirty && tabText.length > 0) {
      if (!wasActive) {
        setActiveTab(id);
      }
      const choice = await openSaveDialog(t("save.tabUnsaved"));
      if (choice === "cancel") {
        return;
      }
      if (choice === "save") {
        const saved = await saveToFile(false);
        if (!saved) {
          return;
        }
      }
    }
    const closedTab = tabs.get(id);
    const shouldTrackClosedTab = !!closedTab && getTabContentText(closedTab).length > 0;
    if (shouldTrackClosedTab && closedTab) {
      trashItems.unshift({
        id: `${Date.now()}-${Math.random()}`,
        title: closedTab.title,
        contentHtml: closedTab.contentHtml,
        contentText: closedTab.contentText || "",
        filePath: closedTab.filePath,
        encoding: closedTab.encoding || "UTF-8",
        timestamp: Date.now()
      });
      trashItems = trashItems.slice(0, 50);
      saveTrash();
    }
    tabs.delete(id);
    if (tabEl) {
      tabEl.classList.add("tab-exit");
      removeWithTransition(tabEl);
    }

    const remaining = Array.from(tabs.keys());
    if (remaining.length === 0) {
      const newTab = createTab(t("tab.untitled"), "", null);
      setActiveTab(newTab.id);
      if (shouldTrackClosedTab && closedTab) {
        lastClosedTab = { ...closedTab, wasActive };
      }
      if (shouldTrackClosedTab && lastClosedTab) {
        showUndoToast(t("toast.tabClosed"), () => restoreClosedTab());
      }
      persistTabs();
      return;
    }
    if (wasActive) {
      setActiveTab(remaining[0]);
    }
    if (shouldTrackClosedTab && closedTab) {
      lastClosedTab = { ...closedTab, wasActive };
      showUndoToast(t("toast.tabClosed"), () => restoreClosedTab());
    }
    persistTabs();
  }

  function restoreClosedTab() {
    if (!lastClosedTab) return;
    const restored = createTab(lastClosedTab.title, lastClosedTab.contentHtml, lastClosedTab.filePath, {
      contentText: lastClosedTab.contentText || ""
    });
    const tab = tabs.get(restored.id);
    if (tab) {
      tab.isDirty = lastClosedTab.isDirty;
      tab.contentHtml = lastClosedTab.contentHtml;
      tab.contentText = lastClosedTab.contentText || htmlToPlainText(lastClosedTab.contentHtml || "");
      tab.filePath = lastClosedTab.filePath;
      setTabDirty(tab, tab.isDirty);
    }
    if (lastClosedTab.wasActive) {
      setActiveTab(restored.id);
    }
    lastClosedTab = null;
  }

  function updateToolbarStates() {
    if (isPlainMode) return;
    const boldBtn = getToolButton("bold");
    const italicBtn = getToolButton("italic");
    const underlineBtn = getToolButton("underline");
    const strikeBtn = getToolButton("strike");
    const codeBtn = getToolButton("code");
    const highlightBtn = getToolButton("highlight");
    const blockquoteBtn = getToolButton("blockquote");
    const subscriptBtn = getToolButton("subscript");
    const superscriptBtn = getToolButton("superscript");
    const alignLeftBtn = getToolButton("align-left");
    const alignCenterBtn = getToolButton("align-center");
    const alignRightBtn = getToolButton("align-right");

    const selection = window.getSelection();
    const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    const inEditor = range ? editor.contains(range.commonAncestorContainer) : false;
    const isCollapsed = range ? range.collapsed : true;
    const boldActive = tiptapEditor
      ? tiptapEditor.isActive("bold")
      : document.queryCommandState("bold") || (inEditor && isCollapsed && forcedInlineState.bold);
    const italicActive = tiptapEditor
      ? tiptapEditor.isActive("italic")
      : document.queryCommandState("italic") || (inEditor && isCollapsed && forcedInlineState.italic);
    const underlineActive = tiptapEditor
      ? tiptapEditor.isActive("underline")
      : document.queryCommandState("underline") || (inEditor && isCollapsed && forcedInlineState.underline);
    boldBtn?.classList.toggle("active", boldActive);
    italicBtn?.classList.toggle("active", italicActive);
    underlineBtn?.classList.toggle("active", underlineActive);
    strikeBtn?.classList.toggle("active", tiptapEditor ? tiptapEditor.isActive("strike") : false);
    codeBtn?.classList.toggle("active", tiptapEditor ? tiptapEditor.isActive("code") : false);
    highlightBtn?.classList.toggle("active", tiptapEditor ? tiptapEditor.isActive("highlight") : false);
    blockquoteBtn?.classList.toggle("active", tiptapEditor ? tiptapEditor.isActive("blockquote") : false);
    subscriptBtn?.classList.toggle("active", tiptapEditor ? tiptapEditor.isActive("subscript") : false);
    superscriptBtn?.classList.toggle("active", tiptapEditor ? tiptapEditor.isActive("superscript") : false);
    bubbleButtons.forEach((button) => {
      const action = button.dataset.action;
      if (action === "bold") button.classList.toggle("active", boldActive);
      if (action === "italic") button.classList.toggle("active", italicActive);
      if (action === "underline") button.classList.toggle("active", underlineActive);
      if (action === "strike") button.classList.toggle("active", tiptapEditor ? tiptapEditor.isActive("strike") : false);
      if (action === "highlight") button.classList.toggle("active", tiptapEditor ? tiptapEditor.isActive("highlight") : false);
      if (action === "code") button.classList.toggle("active", tiptapEditor ? tiptapEditor.isActive("code") : false);
    });
    if (tiptapEditor) {
      alignLeftBtn?.classList.toggle("active", tiptapEditor.isActive({ textAlign: "left" }));
      alignCenterBtn?.classList.toggle("active", tiptapEditor.isActive({ textAlign: "center" }));
      alignRightBtn?.classList.toggle("active", tiptapEditor.isActive({ textAlign: "right" }));
    } else {
      alignLeftBtn?.classList.toggle("active", document.queryCommandState("justifyLeft"));
      alignCenterBtn?.classList.toggle("active", document.queryCommandState("justifyCenter"));
      alignRightBtn?.classList.toggle("active", document.queryCommandState("justifyRight"));
    }

    const inBulletList = tiptapEditor
      ? tiptapEditor.isActive("bulletList")
      : document.queryCommandState("insertUnorderedList");
    const inNumberList = tiptapEditor
      ? tiptapEditor.isActive("orderedList")
      : document.queryCommandState("insertOrderedList");
    listSelector?.classList.toggle("active", inBulletList || inNumberList);
    getToolButton("list:bullet")?.classList.toggle("active", inBulletList);
    getToolButton("list:number")?.classList.toggle("active", inNumberList);

  }

  function getToolButton(action) {
    const scope = toolbarPrimary || toolbar;
    if (!scope) return null;
    return scope.querySelector(`.tool-btn[data-action="${action}"]`);
  }

  function createToolButton(def, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tool-btn";
    button.dataset.action = def.action;
    if (label) {
      button.setAttribute("data-tooltip", label);
      button.title = label;
    }
    if (def.icon) {
      button.innerHTML = `<i data-lucide="${def.icon}"></i>`;
      renderLucideIcons(button);
    } else if (def.text) {
      button.innerHTML = `<span class="tool-text">${def.text}</span>`;
    } else if (label) {
      button.textContent = label;
    }
    return button;
  }

  function createMenuItem(def, label) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "tool-menu-item";
    item.dataset.action = def.action;
    if (def.icon) {
      item.innerHTML = `<i class="tool-icon" data-lucide="${def.icon}"></i><span>${label}</span>`;
      renderLucideIcons(item);
    } else if (def.text) {
      item.innerHTML = `<span class="tool-text">${def.text}</span><span>${label}</span>`;
    } else {
      item.textContent = label;
    }
    return item;
  }

  const INLINE_ACTIONS = new Set([
    "bold",
    "italic",
    "underline",
    "strike",
    "link",
    "code",
    "highlight",
    "subscript",
    "superscript",
    "text-color",
    "highlight-color",
    "undo",
    "redo"
  ]);
  function renderToolbar() {
    if (!toolbar) return;
    if (toolbar.dataset.toolbarLayout === "ide") {
      toolButtons = Array.from(toolbar.querySelectorAll('.tool-btn[data-action]'));
      return;
    }
    const primaryGroup = toolbar.querySelector("[data-toolbar-group=\"primary\"]");
    const blockMenu = toolbar.querySelector("[data-dropdown-menu=\"block\"]");
    const alignMenu = toolbar.querySelector("[data-dropdown-menu=\"align\"]");
    const moreMenu = toolbar.querySelector("[data-dropdown-menu=\"more\"]");
    if (!primaryGroup || !blockMenu || !alignMenu || !moreMenu) return;
    primaryGroup.innerHTML = "";
    blockMenu.innerHTML = "";
    alignMenu.innerHTML = "";
    moreMenu.innerHTML = "";
    const blockDefs = [];
    const alignDefs = [];
    const moreDefs = [];
    const primaryDefs = [];
    TOOL_DEFS.forEach((def) => {
      const label = def.labelKey ? t(def.labelKey) : def.label || "";
      if (def.group === "primary" || INLINE_ACTIONS.has(def.action)) {
        primaryDefs.push({ def, label });
      } else if (def.group === "align") {
        alignDefs.push({ def, label });
      } else if (def.group === "more") {
        moreDefs.push({ def, label });
      } else {
        blockDefs.push({ def, label });
      }
    });
    primaryDefs.forEach(({ def, label }) => primaryGroup.appendChild(createToolButton(def, label)));
    if (blockDefs.length) {
      const section = document.createElement("div");
      section.className = "toolbar-section";
      section.textContent = "Block Type";
      blockMenu.appendChild(section);
      blockDefs.forEach(({ def, label }, index) => {
        if (index === 1) {
          const divider = document.createElement("div");
          divider.className = "toolbar-section-divider";
          blockMenu.appendChild(divider);
        }
        blockMenu.appendChild(createMenuItem(def, label));
      });
    }
    if (alignDefs.length) {
      const section = document.createElement("div");
      section.className = "toolbar-section";
      section.textContent = "Align";
      alignMenu.appendChild(section);
      alignDefs.forEach(({ def, label }) => alignMenu.appendChild(createMenuItem(def, label)));
    }
    if (moreDefs.length) {
      const section = document.createElement("div");
      section.className = "toolbar-section";
      section.textContent = "Advanced";
      moreMenu.appendChild(section);
      moreDefs.forEach(({ def, label }) => moreMenu.appendChild(createMenuItem(def, label)));
    }
    toolButtons = Array.from(toolbar.querySelectorAll('.tool-btn[data-action]'));
  }

  function shouldShowTool(def, context) {
    const ctx = def.context || "always";
    const contexts = Array.isArray(ctx) ? ctx : [ctx];
    if (contexts.includes("always")) return true;
    if (contexts.includes("selection") && context.hasSelection) return true;
    if (contexts.includes("table") && context.inTable) return true;
    return false;
  }

  function updateToolbarVisibility() {
    if (!toolbar) return;
    if (toolbar.dataset.toolbarLayout === "ide") {
      return;
    }
    const hasSelection = tiptapEditor ? !tiptapEditor.state.selection.empty : false;
    const inTable = tiptapEditor ? tiptapEditor.isActive("table") : false;
    const context = { hasSelection, inTable };
    TOOL_DEFS.forEach((def) => {
      const el = toolbar.querySelector(`[data-action="${def.action}"]`);
      if (!el) return;
      const visible = shouldShowTool(def, context);
      el.classList.toggle("is-hidden", !visible);
    });
    const blockVisible = Array.from(toolbarBlockMenu?.children || []).some((child) => !child.classList.contains("is-hidden"));
    const alignVisible = Array.from(toolbarAlignMenu?.children || []).some((child) => !child.classList.contains("is-hidden"));
    const moreVisible = Array.from(toolbarMoreMenu?.children || []).some((child) => !child.classList.contains("is-hidden"));
    toolbarBlockTrigger?.closest(".toolbar-dropdown-group")?.classList.toggle("is-hidden", !blockVisible);
    toolbarAlignTrigger?.closest(".toolbar-dropdown-group")?.classList.toggle("is-hidden", !alignVisible);
    toolbarMoreTrigger?.closest(".toolbar-dropdown-group")?.classList.toggle("is-hidden", !moreVisible);
    const divider = toolbar.querySelector("[data-toolbar-divider]");
    if (divider) {
      divider.classList.toggle("is-hidden", !(blockVisible || alignVisible || moreVisible));
    }
  }

  function closeDropdowns() {
    toolbar?.querySelectorAll(".dropdown-group.open").forEach((group) => group.classList.remove("open"));
  }

  function toggleDropdown(trigger, menu) {
    if (!trigger || !menu) return;
    const group = trigger.closest(".dropdown-group");
    if (!group) return;
    const isOpen = group.classList.contains("open");
    closeDropdowns();
    if (!isOpen) {
      group.classList.add("open");
    }
  }
  function getLastEditableBlock() {
    if (!editor) return null;
    const blocks = editor.querySelectorAll("p,h1,h2,h3,h4,h5,h6,div");
    return blocks.length ? blocks[blocks.length - 1] : null;
  }
  function ensureEditableLine(range) {
    if (!editor) return range;
    if (isTipTapActive()) return range;
    if (!range) {
      const fallback = document.createRange();
      const block = getLastEditableBlock();
      if (!block) {
        const p = document.createElement("p");
        p.appendChild(document.createElement("br"));
        editor.appendChild(p);
        fallback.setStart(p, 0);
      } else if (block.lastChild && block.lastChild.nodeType === Node.TEXT_NODE) {
        fallback.setStart(block.lastChild, block.lastChild.textContent.length);
      } else {
        if (!block.firstChild) {
          block.appendChild(document.createElement("br"));
        }
        fallback.setStart(block, block.childNodes.length);
      }
      fallback.collapse(true);
      return fallback;
    }
    if (!editor.contains(range.startContainer)) {
      const fallback = document.createRange();
      const block = getLastEditableBlock();
      if (!block) {
        const p = document.createElement("p");
        p.appendChild(document.createElement("br"));
        editor.appendChild(p);
        fallback.setStart(p, 0);
      } else if (block.lastChild && block.lastChild.nodeType === Node.TEXT_NODE) {
        fallback.setStart(block.lastChild, block.lastChild.textContent.length);
      } else {
        if (!block.firstChild) {
          block.appendChild(document.createElement("br"));
        }
        fallback.setStart(block, block.childNodes.length);
      }
      fallback.collapse(true);
      return fallback;
    }
    if (getEditorHTML().trim() === "") {
      const p = document.createElement("p");
      p.appendChild(document.createElement("br"));
      editor.appendChild(p);
      const nextRange = document.createRange();
      nextRange.setStart(p, 0);
      nextRange.collapse(true);
      return nextRange;
    }
    if (range.startContainer === editor) {
      const nextRange = document.createRange();
      const block = getLastEditableBlock();
      if (!block) {
        const p = document.createElement("p");
        p.appendChild(document.createElement("br"));
        editor.appendChild(p);
        nextRange.setStart(p, 0);
      } else if (block.lastChild && block.lastChild.nodeType === Node.TEXT_NODE) {
        nextRange.setStart(block.lastChild, block.lastChild.textContent.length);
      } else {
        if (!block.firstChild) {
          block.appendChild(document.createElement("br"));
        }
        nextRange.setStart(block, block.childNodes.length);
      }
      nextRange.collapse(true);
      return nextRange;
    }
    return range;
  }
  function cleanupInlinePlaceholders() {
    if (isTipTapActive()) return;
    if (!editor) return;
    const placeholders = editor.querySelectorAll('span[data-inline-placeholder]');
    placeholders.forEach((span) => {
      const raw = span.textContent || "";
      const cleaned = raw.replace(/\u200B/g, "");
      if (!cleaned) {
        span.remove();
        return;
      }
      const textNode = document.createTextNode(cleaned);
      span.replaceWith(textNode);
    });
    const inlinePlaceholders = editor.querySelectorAll('[data-inline-placeholder]');
    inlinePlaceholders.forEach((node) => {
      const text = node.textContent || "";
      const cleaned = text.replace(/\u200B/g, "");
      if (cleaned !== text) {
        node.textContent = cleaned;
      }
      node.removeAttribute("data-inline-placeholder");
      if (!node.textContent) {
        const isInline = node.matches("b,strong,em,i,u,span");
        if (!isInline) {
          const br = document.createElement("br");
          node.appendChild(br);
        }
      }
    });
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
      if (node.textContent && node.textContent.includes("\u200B")) {
        const cleaned = node.textContent.replace(/\u200B/g, "");
        if (cleaned) {
          node.textContent = cleaned;
        } else {
          const toRemove = node;
          node = walker.nextNode();
          toRemove.remove();
          continue;
        }
      }
      node = walker.nextNode();
    }
  }
  function normalizeInlineCaret(selection) {
    if (isTipTapActive()) return;
    if (!selection || selection.rangeCount === 0) return;
    const node = selection.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    if (!node.textContent || !node.textContent.includes("\u200B")) return;
    const before = node.textContent.slice(0, selection.anchorOffset);
    const removedCount = (before.match(/\u200B/g) || []).length;
    const cleaned = node.textContent.replace(/\u200B/g, "");
    const parent = node.parentNode;
    if (!parent) return;
    if (!cleaned) {
      const isInline = parent.matches("b,strong,em,i,u,span");
      node.textContent = "";
      const range = document.createRange();
      range.setStart(node, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      if (!isInline) {
        const index = Array.from(parent.childNodes).indexOf(node);
        if (index >= 0) {
          node.remove();
          const parentRange = document.createRange();
          parentRange.setStart(parent, Math.max(0, index));
          parentRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(parentRange);
        }
      }
      return;
    }
    node.textContent = cleaned;
    const nextOffset = Math.max(0, selection.anchorOffset - removedCount);
    const range = document.createRange();
    range.setStart(node, Math.min(nextOffset, node.textContent.length));
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  function clearInlinePlaceholderBeforeInput(selection) {
    if (isTipTapActive()) return;
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    let node = range.startContainer;
    if (node.nodeType === Node.ELEMENT_NODE && node.childNodes.length) {
      const index = Math.min(range.startOffset, node.childNodes.length - 1);
      node = node.childNodes[index] || node;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text.includes("\u200B")) {
        const before = text.slice(0, range.startOffset);
        const removedBefore = (before.match(/\u200B/g) || []).length;
        const cleaned = text.replace(/\u200B/g, "");
        node.textContent = cleaned;
        const newOffset = Math.max(0, range.startOffset - removedBefore);
        const nextRange = document.createRange();
        nextRange.setStart(node, Math.min(newOffset, cleaned.length));
        nextRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nextRange);
      }
    }
    const host = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    const placeholder = host?.closest('[data-inline-placeholder]');
    if (placeholder) {
      placeholder.removeAttribute("data-inline-placeholder");
    }
  }
  function replaceEmptyBlockWithTag(range, tag) {
    if (!range || !editor) return false;
    const container = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer
      : range.startContainer.parentElement;
    if (!container) return false;
    const block = container.closest("p,h1,h2,h3,h4,h5,h6,div");
    if (!block || block === editor) return false;
    const text = (block.textContent || "").replace(/\u200B/g, "").trim();
    if (text.length > 0) return false;
    if (block.tagName.toLowerCase() === tag.toLowerCase()) return true;
    const newBlock = document.createElement(tag);
    if (block.childNodes.length) {
      while (block.firstChild) {
        newBlock.appendChild(block.firstChild);
      }
    } else {
      newBlock.appendChild(document.createElement("br"));
    }
    block.replaceWith(newBlock);
    const selection = window.getSelection();
    const caretRange = document.createRange();
    caretRange.setStart(newBlock, 0);
    caretRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(caretRange);
    return true;
  }
  function findInlineContainer(range, selector) {
    if (!range) return null;
    const container = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer
      : range.startContainer.parentElement;
    return container ? container.closest(selector) : null;
  }
  function applyInlineFormat(command, selector, tagName) {
    if (notepadMode) return;
    if (tiptapEditor) {
      const chain = tiptapEditor.chain().focus();
      if (command === "bold") chain.toggleBold();
      if (command === "italic") chain.toggleItalic();
      if (command === "underline") chain.toggleUnderline();
      chain.run();
      updateToolbarStates();
      updateStatus();
      updatePreview();
      return;
    }
    const selection = window.getSelection();
    const range = ensureEditableLine(getActiveEditorRange() || getSavedEditorRange());
    if (!selection || !range) return;
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    if (!range.collapsed) {
      document.execCommand(command, false, null);
      updateToolbarStates();
      updateStatus();
      updatePreview();
      return;
    }
    const isActive = document.queryCommandState(command);
    if (isActive) {
      forcedInlineState[command] = false;
      const container = findInlineContainer(range, selector);
      if (container && container.parentNode) {
        const placeholder = document.createTextNode("\u200B");
        container.parentNode.insertBefore(placeholder, container.nextSibling);
        const caretRange = document.createRange();
        caretRange.setStart(placeholder, placeholder.textContent.length);
        caretRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caretRange);
      } else {
        document.execCommand(command, false, null);
      }
    } else {
      forcedInlineState[command] = true;
      const el = document.createElement(tagName);
      el.setAttribute("data-inline-placeholder", "true");
      el.appendChild(document.createTextNode("\u200B"));
      range.insertNode(el);
      const caretRange = document.createRange();
      caretRange.setStart(el.firstChild, el.firstChild.textContent.length);
      caretRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(caretRange);
    }
    updateToolbarStates();
    updateStatus();
    updatePreview();
  }
  function exec(command, value) {
    if (notepadMode && command !== "insertText") return;
    if (tiptapEditor) {
      const chain = tiptapEditor.chain().focus();
      switch (command) {
        case "bold":
          chain.toggleBold().run();
          break;
        case "italic":
          chain.toggleItalic().run();
          break;
          case "underline":
            chain.toggleUnderline().run();
            break;
          case "strike":
            chain.toggleStrike().run();
            break;
        case "code":
          chain.toggleCode().run();
          break;
          case "highlight":
            chain.toggleHighlight({ color: "#f59e0b" }).run();
            break;
          case "blockquote":
            chain.toggleBlockquote().run();
            break;
          case "horizontalRule":
            chain.setHorizontalRule().run();
            break;
          case "table":
            chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
            break;
          case "tableAddRowAfter":
            chain.addRowAfter().run();
            break;
          case "tableAddRowBefore":
            chain.addRowBefore().run();
            break;
          case "tableAddColumnAfter":
            chain.addColumnAfter().run();
            break;
          case "tableAddColumnBefore":
            chain.addColumnBefore().run();
            break;
          case "tableDeleteRow":
            chain.deleteRow().run();
            break;
          case "tableDeleteColumn":
            chain.deleteColumn().run();
            break;
          case "tableDelete":
            chain.deleteTable().run();
            break;
          case "subscript":
            chain.toggleSubscript().run();
            break;
          case "superscript":
            chain.toggleSuperscript().run();
            break;
          case "textColor":
            chain.setColor(value || "#ffffff").run();
            break;
          case "highlightColor":
            chain.setHighlight({ color: value || "#f59e0b" }).run();
            break;
          case "insertUnorderedList":
            chain.toggleBulletList().run();
            break;
        case "insertOrderedList":
          chain.toggleOrderedList().run();
          break;
        case "justifyLeft":
          chain.setTextAlign("left").run();
          break;
        case "justifyCenter":
          chain.setTextAlign("center").run();
          break;
        case "justifyRight":
          chain.setTextAlign("right").run();
          break;
        case "undo":
          chain.undo().run();
          break;
        case "redo":
          chain.redo().run();
          break;
        case "removeFormat":
          chain.unsetAllMarks().clearNodes().run();
          break;
        case "unlink":
          chain.unsetLink().run();
          break;
        case "insertHTML":
          chain.insertContent(value).run();
          break;
        case "insertText":
          chain.insertContent(value || "").run();
          break;
        default:
          break;
      }
    } else {
      editor.focus();
      document.execCommand(command, false, value);
    }
    updateToolbarStates();
    updateStatus();
    updatePreview();
  }
  function execInlineCommand(command) {
    if (notepadMode) return;
    const selection = window.getSelection();
    const range = ensureEditableLine(getActiveEditorRange() || getSavedEditorRange());
    if (!selection || !range) return;
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand(command, false, null);
    if (range.collapsed) {
      document.execCommand("insertText", false, "\u200B");
      const active = window.getSelection();
      if (active && active.rangeCount > 0) {
        savedRange = active.getRangeAt(0).cloneRange();
      }
    }
    updateToolbarStates();
    updateStatus();
    updatePreview();
  }

  function handleToolbarAction(action) {
    if (!action) return;
    if (notepadMode && action !== "word-wrap") {
      return;
    }
    editor.focus();
    const selection = window.getSelection();
    const range = ensureEditableLine(getActiveEditorRange() || getSavedEditorRange());
    if (selection && range) {
      selection.removeAllRanges();
      selection.addRange(range);
      savedRange = range.cloneRange();
    }
    switch (action) {
      case "bold":
        applyInlineFormat("bold", "b,strong", "strong");
        break;
      case "italic":
        applyInlineFormat("italic", "i,em", "em");
        break;
        case "underline":
          applyInlineFormat("underline", "u", "u");
          break;
        case "strike":
          if (tiptapEditor) {
            exec("strike");
          }
          break;
        case "code":
          if (tiptapEditor) {
            exec("code");
          }
          break;
        case "highlight":
          if (tiptapEditor) {
            exec("highlight");
          }
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
      case "list:bullet":
        exec("insertUnorderedList");
        break;
      case "list:number":
        exec("insertOrderedList");
        break;
        case "blockquote":
          if (tiptapEditor) {
            exec("blockquote");
          }
          break;
      case "horizontal-rule":
        if (tiptapEditor) {
          exec("horizontalRule");
        }
        break;
        case "table":
          if (tiptapEditor) {
            exec("table");
          }
          break;
        case "table:add-row":
          if (tiptapEditor) {
            exec("tableAddRowAfter");
          }
          break;
        case "table:add-col":
          if (tiptapEditor) {
            exec("tableAddColumnAfter");
          }
          break;
        case "table:add-row-after":
          if (tiptapEditor) {
            exec("tableAddRowAfter");
          }
          break;
        case "table:add-row-before":
          if (tiptapEditor) {
            exec("tableAddRowBefore");
          }
          break;
        case "table:add-col-after":
          if (tiptapEditor) {
            exec("tableAddColumnAfter");
          }
          break;
        case "table:add-col-before":
          if (tiptapEditor) {
            exec("tableAddColumnBefore");
          }
          break;
        case "table:delete-row":
          if (tiptapEditor) {
            exec("tableDeleteRow");
          }
          break;
        case "table:delete-col":
          if (tiptapEditor) {
            exec("tableDeleteColumn");
          }
          break;
        case "table:delete":
          if (tiptapEditor) {
            exec("tableDelete");
          }
          break;
        case "subscript":
          if (tiptapEditor) {
            exec("subscript");
          }
          break;
        case "superscript":
          if (tiptapEditor) {
            exec("superscript");
          }
          break;
        case "text-color":
        case "highlight-color": {
          const type = action === "text-color" ? "text" : "highlight";
          const input = colorInputs.find((el) => el.dataset.colorInput === type);
          input?.click();
          break;
        }
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
    restoreEditorFocusAfterAction();
  }

  function formatBlock(tag) {
    if (notepadMode) return;
    if (tiptapEditor) {
      if (tag === "P") {
        tiptapEditor.chain().focus().setParagraph().run();
      } else {
        const level = parseInt(tag.replace("H", ""), 10);
        if (Number.isFinite(level)) {
          tiptapEditor.chain().focus().setHeading({ level }).run();
        }
      }
      updateToolbarStates();
      updateStatus();
      updatePreview();
      return;
    }
    const range = ensureEditableLine(getActiveEditorRange());
    if (!range) return;
    editor.focus();
    if (range.collapsed) {
      if (replaceEmptyBlockWithTag(range, tag)) {
        updateToolbarStates();
        updateStatus();
        updatePreview();
        return;
      }
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
    if (tiptapEditor) {
      if (tag === "P") {
        tiptapEditor.chain().focus().setParagraph().run();
      } else {
        const level = parseInt(tag.replace("H", ""), 10);
        if (Number.isFinite(level)) {
          tiptapEditor.chain().focus().setHeading({ level }).run();
        }
      }
      updateToolbarStates();
      updateStatus();
      updatePreview();
      return;
    }
    const range = ensureEditableLine(getActiveEditorRange());
    if (!range) return;
    editor.focus();
    if (range.collapsed) {
      if (replaceEmptyBlockWithTag(range, tag)) {
        updateToolbarStates();
        updateStatus();
        updatePreview();
        return;
      }
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
    range = ensureEditableLine(range);
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

  function clearFormatting() {
    if (notepadMode) return;
    exec("removeFormat");
    exec("unlink");
  }

  function setWordWrap(enabled) {
    isWrap = enabled;
    editor.classList.toggle("no-wrap", !isWrap);
    getToolButton("word-wrap")?.classList.toggle("active", isWrap);
    if (settingsModal?.classList.contains("open")) {
      syncSettingsUI();
    }
    if (settingsWordWrapToggle) {
      settingsWordWrapToggle.checked = isWrap;
      settingsWordWrapToggle.setAttribute("aria-checked", isWrap ? "true" : "false");
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

  function htmlToMarkdown(html) {
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    const body = doc.body;

    const renderInline = (node) => {
      if (!node) return "";
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.nodeValue || "").replace(/\s+/g, " ");
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }
      const tag = node.tagName.toLowerCase();
      if (tag === "strong" || tag === "b") {
        return `**${renderInlineChildren(node)}**`;
      }
      if (tag === "em" || tag === "i") {
        return `*${renderInlineChildren(node)}*`;
      }
      if (tag === "u") {
        return `<u>${renderInlineChildren(node)}</u>`;
      }
      if (tag === "code") {
        const text = renderInlineChildren(node).replace(/`/g, "\\`");
        return `\`${text}\``;
      }
      if (tag === "a") {
        const href = node.getAttribute("href") || "";
        const text = renderInlineChildren(node);
        return href ? `[${text}](${href})` : text;
      }
      if (tag === "br") {
        return "\n";
      }
      return renderInlineChildren(node);
    };

    const renderInlineChildren = (node) =>
      Array.from(node.childNodes).map((child) => renderInline(child)).join("");

    const renderList = (listNode, indent) => {
      const isOrdered = listNode.tagName.toLowerCase() === "ol";
      let index = 1;
      const lines = [];
      Array.from(listNode.children).forEach((child) => {
        if (child.tagName?.toLowerCase() !== "li") return;
        const marker = isOrdered ? `${index}.` : "-";
        index += 1;
        let inlineText = "";
        const nestedLists = [];
        Array.from(child.childNodes).forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName.toLowerCase();
            if (tag === "ul" || tag === "ol") {
              nestedLists.push(renderList(node, indent + 2));
              return;
            }
          }
          inlineText += renderInline(node);
        });
        inlineText = inlineText.replace(/\s+/g, " ").trim();
        const line = `${" ".repeat(indent)}${marker} ${inlineText}`.trimEnd();
        lines.push(line);
        nestedLists.forEach((nested) => {
          if (nested) {
            lines.push(nested);
          }
        });
      });
      return lines.join("\n");
    };

    const renderBlock = (node) => {
      if (!node) return "";
      if (node.nodeType === Node.TEXT_NODE) {
        const text = (node.nodeValue || "").trim();
        return text ? `${text}\n\n` : "";
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }
      const tag = node.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        const level = parseInt(tag.replace("h", ""), 10);
        return `${"#".repeat(level)} ${renderInlineChildren(node).trim()}\n\n`;
      }
      if (tag === "p" || tag === "div" || tag === "section") {
        const text = renderInlineChildren(node).trim();
        return text ? `${text}\n\n` : "";
      }
      if (tag === "blockquote") {
        const inner = renderInlineChildren(node).trim();
        if (!inner) return "";
        return inner
          .split(/\n+/)
          .map((line) => `> ${line}`)
          .join("\n") + "\n\n";
      }
      if (tag === "ul" || tag === "ol") {
        const list = renderList(node, 0);
        return list ? `${list}\n\n` : "";
      }
      if (tag === "pre") {
        const code = node.textContent || "";
        return `\`\`\`\n${code.replace(/\s+$/, "")}\n\`\`\`\n\n`;
      }
      return renderInlineChildren(node).trim() ? `${renderInlineChildren(node).trim()}\n\n` : "";
    };

    const blocks = Array.from(body.childNodes).map((child) => renderBlock(child)).join("");
    return blocks.replace(/\n{3,}/g, "\n\n").trim();
  }

  let outlineEntries = [];
  let lastEditedAt = Date.now();

  function updateSidePanel() {
    if (isPlainMode || !outlinePanel) return;
    const headings = Array.from(editor.querySelectorAll("h1,h2,h3"));
    outlineEntries = headings.map((heading, index) => ({
      id: `heading-${index}`,
      level: parseInt(heading.tagName.slice(1), 10),
      el: heading,
      text: heading.textContent.trim() || `${t("panel.headingFallback")} ${index + 1}`
    }));
    if (outlineList) {
      outlineList.innerHTML = "";
      if (outlineEntries.length === 0) {
        const empty = document.createElement("div");
        empty.className = "outline-item";
        empty.textContent = t("panel.noHeadings");
        outlineList.appendChild(empty);
      } else {
        outlineEntries.forEach((entry) => {
          const item = document.createElement("div");
          item.className = `outline-item level-${entry.level}`;
          item.dataset.outlineId = entry.id;
          item.textContent = entry.text;
          item.addEventListener("click", () => {
            const behavior = prefersReducedMotion.matches ? "auto" : "smooth";
            editor.scrollTo({ top: entry.el.offsetTop - 8, behavior });
          });
          outlineList.appendChild(item);
        });
      }
    }
    const text = getEditorText();
    const tags = Array.from(new Set((text.match(/(^|\s)#([\w-]+)/g) || []).map((tag) => tag.trim().replace(/^#/, ""))));
    if (tagChips) {
      tagChips.innerHTML = "";
      if (tags.length === 0) {
        const chip = document.createElement("span");
        chip.className = "tag-chip";
        chip.textContent = t("panel.noTags");
        tagChips.appendChild(chip);
      } else {
        tags.forEach((tag) => {
          const chip = document.createElement("span");
          chip.className = "tag-chip";
          chip.textContent = `#${tag}`;
          chip.addEventListener("click", () => {
            showNotification(`${t("panel.tagLabel")}: #${tag}`);
          });
          tagChips.appendChild(chip);
        });
      }
    }
    const links = Array.from(new Set((text.match(/\[\[([^\]]+)\]\]/g) || []).map((match) => match.slice(2, -2).trim()))).filter(Boolean);
    if (backlinksList) {
      const mockBacklinks = ["Project Plan", "Daily Notes"];
      const items = links.length > 0 ? links : mockBacklinks;
      backlinksList.innerHTML = "";
      items.forEach((title) => {
        const item = document.createElement("div");
        item.className = "backlink-item";
        item.textContent = title;
        item.addEventListener("click", () => {
          const content = `<h1>${escapeHtml(title)}</h1><p>This note is a placeholder.</p>`;
          const tab = createTab(title, content, null);
          setActiveTab(tab.id);
          setTabDirty(tab, false);
        });
        backlinksList.appendChild(item);
      });
    }
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const readingMinutes = Math.max(1, Math.ceil(words / 200));
    if (noteWords) noteWords.textContent = `${t("panel.words")}: ${words}`;
    if (noteChars) noteChars.textContent = `${t("panel.characters")}: ${chars}`;
    if (noteReading) noteReading.textContent = `${t("panel.readingTime")}: ${readingMinutes} ${t("panel.minutes")}`;
    if (noteUpdated) {
      const time = new Date(lastEditedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      noteUpdated.textContent = `${t("panel.lastEdited")}: ${time}`;
    }
    highlightOutlineByScroll();
  }

  function updatePreview() {
    if (isPlainMode) return;
    updateSidePanel();
  }

  function highlightOutlineByScroll() {
    if (!outlineEntries.length || !outlineList) return;
    const scrollTop = editor.scrollTop;
    let activeId = outlineEntries[0]?.id || "";
    outlineEntries.forEach((entry) => {
      if (entry.el.offsetTop - 10 <= scrollTop) {
        activeId = entry.id;
      }
    });
    const items = outlineList.querySelectorAll(".outline-item");
    items.forEach((item) => {
      item.classList.toggle("active", item.dataset.outlineId === activeId);
    });
  }

  function setSidePanelOpen(open) {
    isSidePanelOpen = open;
    editorShell?.classList.toggle("side-panel-open", isSidePanelOpen);
    outlinePanel?.setAttribute("aria-hidden", isSidePanelOpen ? "false" : "true");
    btnPreview?.classList.toggle("active", isSidePanelOpen);
    localStorage.setItem("lp:sidePanelOpen", isSidePanelOpen ? "1" : "0");
    if (isSidePanelOpen) {
      updateSidePanel();
    }
  }

  function togglePreview() {
    setSidePanelOpen(!isSidePanelOpen);
  }

  function getSidePanelWidthBounds() {
    const shellWidth = editorShell?.clientWidth || window.innerWidth || 0;
    const dynamicMax = Math.max(
      SIDE_PANEL_MIN_WIDTH,
      Math.min(SIDE_PANEL_MAX_WIDTH, shellWidth - MIN_EDITOR_CONTENT_WIDTH)
    );
    return {
      min: SIDE_PANEL_MIN_WIDTH,
      max: dynamicMax
    };
  }

  function setSidePanelWidth(width) {
    const { min, max } = getSidePanelWidthBounds();
    const clamped = Math.max(min, Math.min(max, width));
    document.documentElement.style.setProperty("--side-panel-width", `${clamped}px`);
    localStorage.setItem("lp:sidePanelWidth", String(clamped));
  }

  function clampSidePanelWidth() {
    const cssValue = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--side-panel-width"), 10);
    const storedValue = parseInt(localStorage.getItem("lp:sidePanelWidth") || "", 10);
    const current = Number.isFinite(cssValue)
      ? cssValue
      : (Number.isFinite(storedValue) ? storedValue : SIDE_PANEL_MIN_WIDTH);
    setSidePanelWidth(current);
  }

  async function toggleZenMode() {
    isZenMode = !isZenMode;
    document.body.classList.toggle("zen-mode", isZenMode);
    document.body.classList.toggle("viewmode-enter", isZenMode);
    btnZen?.classList.toggle("active", isZenMode);
    if (isZenMode) {
      setTimeout(() => {
        document.body.classList.remove("viewmode-enter");
      }, 500);
    }
    if (api) {
      const result = await api.action("view:setFullscreen", { enabled: isZenMode });
      if (typeof result?.fullScreen === "boolean") {
        isFullScreen = result.fullScreen;
      }
    }
  }

  function updateFooterToggles() {
    if (statusAutoSave) {
      const state = autosaveEnabled ? t("footer.on") : t("footer.off");
      statusAutoSave.textContent = `${t("footer.autoSave")}: ${state}`;
    }
    if (statusEncoding) {
      const active = tabs.get(activeTabId);
      statusEncoding.textContent = active?.encoding || "UTF-8";
    }
  }

  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${String(remainingMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function updateSessionTime() {
    if (!statusSession) return;
    statusSession.textContent = `${t("footer.session")}: ${formatDuration(Date.now() - sessionStart)}`;
  }

  function getAutosaveIntervalLabel(ms) {
    if (ms === 10000) return "10 sec";
    if (ms === 30000) return "30 sec";
    return "5 sec";
  }

  function parseAutosaveInterval(label) {
    if (label === "10 sec") return 10000;
    if (label === "30 sec") return 30000;
    return 5000;
  }

  function startSessionTimer() {
    if (!statusSession || sessionTimer) return;
    updateSessionTime();
    sessionTimer = setInterval(updateSessionTime, 1000);
  }

  function startAutosave() {
    if (!autosaveEnabled || autosaveTimer) return;
    autosaveTimer = setInterval(async () => {
      const tab = tabs.get(activeTabId);
      if (!tab || !tab.filePath || !tab.isDirty || !api) return;
      try {
        if (lastAutosaveStatus !== "saving") {
          lastAutosaveStatus = "saving";
          addActivity({ type: "autosave", title: t("autosave.inProgress") });
        }
        const result = await api.action("file:autoSave", {
          content: isPlainMode && plainEditorInstance ? plainEditorInstance.getText() : getEditorText(),
          filePath: tab.filePath
        });
        if (result && !result.canceled) {
          if (isPlainMode && plainEditorInstance) {
            tab.contentText = plainEditorInstance.getText();
          } else {
            tab.contentHtml = getEditorHTML();
            tab.contentText = htmlToPlainText(tab.contentHtml);
          }
          setTabDirty(tab, false);
          if (lastAutosaveStatus !== "saved") {
            lastAutosaveStatus = "saved";
            addActivity({ type: "autosave", title: t("autosave.complete") });
          }
        }
      } catch (_error) {
        if (lastAutosaveStatus !== "error") {
          lastAutosaveStatus = "error";
          addActivity({
            type: "error",
            title: t("toast.autosaveFailed"),
            actions: [
              {
                label: t("activity.retry"),
                handler: async () => {
                  if (!api) return;
                  await api.action("file:autoSave", {
                    content: isPlainMode && plainEditorInstance ? plainEditorInstance.getText() : getEditorText(),
                    filePath: tab.filePath
                  });
                  lastAutosaveStatus = "saved";
                  addActivity({ type: "autosave", title: t("autosave.complete") });
                }
              }
            ]
          });
          showErrorToast(t("toast.autosaveFailed"));
        }
      }
    }, autosaveIntervalMs);
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
    if (settingsAutoSaveToggle) {
      settingsAutoSaveToggle.checked = autosaveEnabled;
      settingsAutoSaveToggle.setAttribute("aria-checked", autosaveEnabled ? "true" : "false");
    }
  }

  function setAutosaveInterval(ms) {
    autosaveIntervalMs = ms;
    localStorage.setItem("lp:autoSaveInterval", String(ms));
    if (autosaveEnabled) {
      stopAutosave();
      startAutosave();
    }
  }

  function setSpellcheck(enabled) {
    const value = !!enabled;
    if (editor) {
      editor.setAttribute("spellcheck", value ? "true" : "false");
    }
    localStorage.setItem("lp:spellcheck", value ? "1" : "0");
    if (settingsSpellcheckToggle) {
      settingsSpellcheckToggle.checked = value;
      settingsSpellcheckToggle.setAttribute("aria-checked", value ? "true" : "false");
    }
  }

  function toggleAutosave() {
    setAutosave(!autosaveEnabled);
  }

  function toggleMarkdownMode() {
    markdownMode = !markdownMode;
    localStorage.setItem("lp:markdownMode", markdownMode ? "1" : "0");
    updateFooterToggles();
    updatePreview();
  }

  function setPlainMode(enabled) {
    isPlainMode = !!enabled;
    localStorage.setItem("lp:plainMode", isPlainMode ? "1" : "0");
    document.body.classList.toggle("plain-mode", isPlainMode);
    if (settingsPlainModeToggle) {
      settingsPlainModeToggle.checked = isPlainMode;
      settingsPlainModeToggle.setAttribute("aria-checked", isPlainMode ? "true" : "false");
    }
    if (isPlainMode) {
      setSidePanelOpen(false);
    }
    scheduleLineHighlight();
    const tab = tabs.get(activeTabId);
    if (!plainEditorInstance || !tab) return;
    plainEditorInstance.updateMetricsFromEditor();
    if (isPlainMode) {
      const text = tab.contentText || htmlToPlainText(tab.contentHtml || getEditorHTML());
      plainEditorInstance.setText(text);
      plainEditorInstance.focus();
      tab.contentText = text;
      scheduleStatusUpdate();
    } else {
      const text = plainEditorInstance.getText();
      const ext = tab.filePath ? tab.filePath.split(".").pop().toLowerCase() : "";
      const shouldRenderMarkdown = markdownMode && ext === "md";
      if (shouldRenderMarkdown) {
        setEditorHTML(renderMarkdown(text));
        tab.contentHtml = getEditorHTML();
        tab.contentText = htmlToPlainText(tab.contentHtml);
      } else {
        setEditorHTML(text);
        tab.contentHtml = getEditorHTML();
        tab.contentText = text;
      }
      updateStatus();
      updatePreview();
    }
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
    },
    orange: {
      primary: "#f97316",
      glow: "rgba(249, 115, 22, 0.25)",
      highlightBg: "#2b1d12",
      highlightText: "#fb923c"
    },
    red: {
      primary: "#ef4444",
      glow: "rgba(239, 68, 68, 0.25)",
      highlightBg: "#2b1414",
      highlightText: "#f87171"
    },
    teal: {
      primary: "#14b8a6",
      glow: "rgba(20, 184, 166, 0.25)",
      highlightBg: "#122626",
      highlightText: "#2dd4bf"
    }
  };

  function applyAccentPaletteValues(palette) {
    if (!palette) return;
    document.documentElement.style.setProperty("--accent-primary", palette.primary);
    document.documentElement.style.setProperty("--accent-glow", palette.glow);
    document.documentElement.style.setProperty("--highlight-bg", palette.highlightBg);
    document.documentElement.style.setProperty("--highlight-text", palette.highlightText);
  }

  function setAccentColor(themeName) {
    const theme = accentThemes[themeName];
    if (!theme) return;
    applyAccentPaletteValues(theme);
    localStorage.setItem("lp:accentColor", themeName);
    settingsAccentChips.forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.accent === themeName);
    });
    if (settingsModal?.classList.contains("open")) {
      syncSettingsUI();
    }
  }

  function setCustomAccentColorFromHex(hexColor, options = {}) {
    const { persist = true } = options;
    const rgb = hexToRgb(hexColor);
    if (!rgb) return false;
    const hsl = rgbToHsl(rgb);
    const tuned = hslToRgb(hsl.h, Math.max(0.55, hsl.s), Math.min(0.62, Math.max(0.46, hsl.l)));
    const highlightBg = mixRgb(tuned, { r: 18, g: 22, b: 30 }, 0.72);
    const highlightText = hslToRgb(hsl.h, Math.max(0.52, hsl.s * 0.78), Math.min(0.76, Math.max(0.62, hsl.l + 0.12)));
    applyAccentPaletteValues({
      primary: rgbToHex(tuned),
      glow: `rgba(${tuned.r}, ${tuned.g}, ${tuned.b}, 0.25)`,
      highlightBg: rgbToCss(highlightBg),
      highlightText: rgbToCss(highlightText)
    });
    settingsAccentChips.forEach((chip) => chip.classList.remove("active"));
    if (persist) {
      localStorage.setItem("lp:accentColor", `custom:${rgbToHex(tuned).slice(1)}`);
    }
    if (settingsModal?.classList.contains("open")) {
      syncSettingsUI();
    }
    return true;
  }

  function normalizeInt(value, min, max, fallback) {
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function filePathToFileUrl(filePath) {
    const raw = String(filePath || "").trim();
    if (!raw) return "";
    const normalized = raw.replace(/\\/g, "/");
    if (/^[a-zA-Z]:\//.test(normalized)) {
      return `file:///${encodeURI(normalized)}`;
    }
    if (normalized.startsWith("//")) {
      return `file:${encodeURI(normalized)}`;
    }
    return `file://${encodeURI(normalized)}`;
  }

  function resolveBackgroundVideoSource(pathValue) {
    const raw = String(pathValue || "").trim();
    if (!raw) return "";
    if (raw.startsWith(BUILTIN_BG_VIDEO_PREFIX)) {
      const fileName = raw.slice(BUILTIN_BG_VIDEO_PREFIX.length).trim();
      if (!fileName) return "";
      return new URL(`examples/${fileName}`, window.location.href).toString();
    }
    return filePathToFileUrl(raw);
  }

  function isVideoBackgroundFile(file) {
    if (!file) return false;
    const type = String(file.type || "").toLowerCase();
    if (type.startsWith("video/")) return true;
    const name = String(file.name || "");
    const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
    return ["mp4", "webm", "ogg", "mov", "m4v"].includes(ext);
  }

  function releaseBackgroundVideoObjectUrl() {
    if (backgroundVideoObjectUrl) {
      URL.revokeObjectURL(backgroundVideoObjectUrl);
      backgroundVideoObjectUrl = "";
    }
  }

  function ensureAdaptiveVibeStyleElement() {
    if (adaptiveVibeStyleEl && adaptiveVibeStyleEl.isConnected) {
      return adaptiveVibeStyleEl;
    }
    adaptiveVibeStyleEl = document.createElement("style");
    adaptiveVibeStyleEl.id = "adaptive-vibe-style";
    document.head.appendChild(adaptiveVibeStyleEl);
    return adaptiveVibeStyleEl;
  }

  function stopAdaptiveVibeVideoSampling() {
    if (!adaptiveVibeVideoTimer) return;
    clearInterval(adaptiveVibeVideoTimer);
    adaptiveVibeVideoTimer = 0;
  }

  function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  function mixRgb(a, b, t) {
    return {
      r: clampByte(a.r * (1 - t) + b.r * t),
      g: clampByte(a.g * (1 - t) + b.g * t),
      b: clampByte(a.b * (1 - t) + b.b * t)
    };
  }

  function capRgb(rgb, maxValue) {
    return {
      r: Math.min(maxValue, rgb.r),
      g: Math.min(maxValue, rgb.g),
      b: Math.min(maxValue, rgb.b)
    };
  }

  function rgbToCss(rgb) {
    return `rgb(${clampByte(rgb.r)}, ${clampByte(rgb.g)}, ${clampByte(rgb.b)})`;
  }

  function rgbToHex(rgb) {
    const toHex = (value) => clampByte(value).toString(16).padStart(2, "0");
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  function hexToRgb(hex) {
    const value = String(hex || "").trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function rgbToHsl(rgb) {
    const r = clampByte(rgb.r) / 255;
    const g = clampByte(rgb.g) / 255;
    const b = clampByte(rgb.b) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (delta > 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      if (max === r) {
        h = ((g - b) / delta) % 6;
      } else if (max === g) {
        h = (b - r) / delta + 2;
      } else {
        h = (r - g) / delta + 4;
      }
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s, l };
  }

  function hslToRgb(h, s, l) {
    const hue = ((Number(h) % 360) + 360) % 360;
    const sat = Math.max(0, Math.min(1, Number(s)));
    const light = Math.max(0, Math.min(1, Number(l)));
    const c = (1 - Math.abs(2 * light - 1)) * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = light - c / 2;
    let r1 = 0;
    let g1 = 0;
    let b1 = 0;
    if (hue < 60) {
      r1 = c; g1 = x; b1 = 0;
    } else if (hue < 120) {
      r1 = x; g1 = c; b1 = 0;
    } else if (hue < 180) {
      r1 = 0; g1 = c; b1 = x;
    } else if (hue < 240) {
      r1 = 0; g1 = x; b1 = c;
    } else if (hue < 300) {
      r1 = x; g1 = 0; b1 = c;
    } else {
      r1 = c; g1 = 0; b1 = x;
    }
    return {
      r: clampByte((r1 + m) * 255),
      g: clampByte((g1 + m) * 255),
      b: clampByte((b1 + m) * 255)
    };
  }

  function extractAdaptiveColorFromImageData(data) {
    if (!data || !data.length) return null;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let sumWeight = 0;
    const stride = 16;
    for (let i = 0; i < data.length; i += stride) {
      const alpha = data[i + 3];
      if (alpha < 24) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const sat = max === 0 ? 0 : (max - min) / max;
      const midTone = 1 - Math.min(1, Math.abs(lum - 0.42) * 2.2);
      const weight = 0.24 + sat * 0.95 + midTone * 0.38;
      sumR += r * weight;
      sumG += g * weight;
      sumB += b * weight;
      sumWeight += weight;
    }
    if (sumWeight <= 0) return null;
    return {
      r: clampByte(sumR / sumWeight),
      g: clampByte(sumG / sumWeight),
      b: clampByte(sumB / sumWeight)
    };
  }

  function buildAdaptivePalette(baseColor) {
    const base = capRgb(baseColor, 188);
    const bg = capRgb(mixRgb(base, { r: 11, g: 12, b: 16 }, 0.9), 42);
    const panel = capRgb(mixRgb(base, { r: 17, g: 18, b: 24 }, 0.82), 58);
    const panelStrong = capRgb(mixRgb(base, { r: 21, g: 23, b: 31 }, 0.76), 74);
    const border = capRgb(mixRgb(base, { r: 39, g: 41, b: 48 }, 0.6), 102);
    const borderSoft = capRgb(mixRgb(base, { r: 31, g: 33, b: 40 }, 0.66), 92);
    const hover = capRgb(mixRgb(base, { r: 46, g: 48, b: 58 }, 0.56), 114);
    const muted = mixRgb(base, { r: 161, g: 161, b: 170 }, 0.72);
    return {
      bg: rgbToCss(bg),
      panel: rgbToCss(panel),
      panelStrong: rgbToCss(panelStrong),
      border: rgbToCss(border),
      borderSoft: rgbToCss(borderSoft),
      hover: rgbToCss(hover),
      muted: rgbToCss(muted)
    };
  }

  function buildSuggestedAccentFromDominant(baseColor) {
    const hsl = rgbToHsl(baseColor);
    const tuned = hslToRgb(
      hsl.h,
      Math.max(0.58, hsl.s),
      Math.min(0.64, Math.max(0.48, hsl.l))
    );
    return rgbToHex(tuned);
  }

  function updateAdaptiveAccentSuggestionUI() {
    const hasSuggestion = !!adaptiveSuggestedAccentHex;
    if (settingsAdaptiveAccentPreview) {
      settingsAdaptiveAccentPreview.style.background = hasSuggestion ? adaptiveSuggestedAccentHex : "#1a1d25";
      settingsAdaptiveAccentPreview.style.borderColor = hasSuggestion ? "rgba(255,255,255,0.25)" : "#343844";
    }
    if (settingsAdaptiveAccentValue) {
      settingsAdaptiveAccentValue.textContent = hasSuggestion ? adaptiveSuggestedAccentHex.toUpperCase() : "--";
    }
    if (settingsAdaptiveAccentButton) {
      settingsAdaptiveAccentButton.disabled = !hasSuggestion;
    }
  }

  function setAdaptiveSuggestedAccent(color) {
    if (!color) {
      adaptiveSuggestedAccentHex = "";
      localStorage.removeItem("lp:adaptiveSuggestedAccent");
      updateAdaptiveAccentSuggestionUI();
      return;
    }
    adaptiveSuggestedAccentHex = buildSuggestedAccentFromDominant(color);
    localStorage.setItem("lp:adaptiveSuggestedAccent", adaptiveSuggestedAccentHex);
    updateAdaptiveAccentSuggestionUI();
  }

  function clearAdaptiveVibeStyles() {
    adaptiveVibeSampleToken += 1;
    stopAdaptiveVibeVideoSampling();
    document.body.classList.remove("adaptive-vibe");
    document.documentElement.style.setProperty("--bg-color", DEFAULT_THEME_NEUTRALS.bg);
    document.documentElement.style.setProperty("--border-color", DEFAULT_THEME_NEUTRALS.border);
    document.documentElement.style.setProperty("--text-muted", DEFAULT_THEME_NEUTRALS.muted);
    ensureAdaptiveVibeStyleElement().textContent = "";
  }

  function applyAdaptivePalette(palette) {
    const style = ensureAdaptiveVibeStyleElement();
    style.textContent = `
body.adaptive-vibe {
  --bg-color: ${palette.bg};
  --border-color: ${palette.border};
  --text-muted: ${palette.muted};
}
body.adaptive-vibe .app-window,
body.adaptive-vibe header,
body.adaptive-vibe footer,
body.adaptive-vibe .settings-page-header {
  background: ${palette.bg};
}
body.adaptive-vibe .menu-item:hover,
body.adaptive-vibe .menu-item.open,
body.adaptive-vibe .menu-item.focused,
body.adaptive-vibe .secondary-btn:hover,
body.adaptive-vibe .dropdown-trigger:hover {
  background-color: ${palette.hover};
}
body.adaptive-vibe .menu-dropdown,
body.adaptive-vibe .settings-section {
  background: ${palette.panelStrong};
  border-color: ${palette.border};
}
body.adaptive-vibe .settings-item,
body.adaptive-vibe .trash-card,
body.adaptive-vibe .about-card,
body.adaptive-vibe .update-card,
body.adaptive-vibe .download-card,
body.adaptive-vibe .changelog-card,
body.adaptive-vibe .save-card {
  background: ${palette.panel};
  border-color: ${palette.borderSoft};
}
body.adaptive-vibe .settings-select,
body.adaptive-vibe .settings-input,
body.adaptive-vibe .dropdown-trigger,
body.adaptive-vibe .secondary-btn {
  background: ${palette.panel};
  border-color: ${palette.borderSoft};
}
`;
    document.body.classList.add("adaptive-vibe");
  }

  function sampleAdaptiveColorFromImage(src) {
    return new Promise((resolve) => {
      if (!src || !adaptiveSampleCtx) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        try {
          adaptiveSampleCtx.clearRect(0, 0, ADAPTIVE_SAMPLE_SIZE, ADAPTIVE_SAMPLE_SIZE);
          adaptiveSampleCtx.drawImage(img, 0, 0, ADAPTIVE_SAMPLE_SIZE, ADAPTIVE_SAMPLE_SIZE);
          const { data } = adaptiveSampleCtx.getImageData(0, 0, ADAPTIVE_SAMPLE_SIZE, ADAPTIVE_SAMPLE_SIZE);
          resolve(extractAdaptiveColorFromImageData(data));
        } catch (_error) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function sampleAdaptiveColorFromVideo(videoEl) {
    if (!videoEl || !adaptiveSampleCtx) return null;
    if (videoEl.readyState < 2 || videoEl.videoWidth <= 0 || videoEl.videoHeight <= 0) return null;
    try {
      adaptiveSampleCtx.clearRect(0, 0, ADAPTIVE_SAMPLE_SIZE, ADAPTIVE_SAMPLE_SIZE);
      adaptiveSampleCtx.drawImage(videoEl, 0, 0, ADAPTIVE_SAMPLE_SIZE, ADAPTIVE_SAMPLE_SIZE);
      const { data } = adaptiveSampleCtx.getImageData(0, 0, ADAPTIVE_SAMPLE_SIZE, ADAPTIVE_SAMPLE_SIZE);
      return extractAdaptiveColorFromImageData(data);
    } catch (_error) {
      return null;
    }
  }

  function refreshAdaptiveVibeFromCurrentMedia() {
    const hasImage = !!backgroundImageData;
    const hasVideo = backgroundMediaType === "video" && !!backgroundVideoSource;
    if (!hasImage && !hasVideo) {
      setAdaptiveSuggestedAccent(null);
      clearAdaptiveVibeStyles();
      return;
    }
    if (hasImage) {
      stopAdaptiveVibeVideoSampling();
      const token = ++adaptiveVibeSampleToken;
      sampleAdaptiveColorFromImage(backgroundImageData).then((color) => {
        if (token !== adaptiveVibeSampleToken) return;
        if (!color) {
          setAdaptiveSuggestedAccent(null);
          if (adaptiveVibeEnabled) {
            clearAdaptiveVibeStyles();
          }
          return;
        }
        setAdaptiveSuggestedAccent(color);
        if (adaptiveVibeEnabled) {
          applyAdaptivePalette(buildAdaptivePalette(color));
        } else {
          clearAdaptiveVibeStyles();
        }
      });
      return;
    }
    const sampleVideo = () => {
      const color = sampleAdaptiveColorFromVideo(appBackgroundVideo);
      if (!color) return;
      setAdaptiveSuggestedAccent(color);
      if (adaptiveVibeEnabled) {
        applyAdaptivePalette(buildAdaptivePalette(color));
      }
    };
    if (!adaptiveVibeEnabled) {
      clearAdaptiveVibeStyles();
      sampleVideo();
      return;
    }
    sampleVideo();
    if (!adaptiveVibeVideoTimer) {
      adaptiveVibeVideoTimer = setInterval(sampleVideo, 2200);
    }
  }

  function setAdaptiveVibeEnabled(enabled, options = {}) {
    const { persist = true } = options;
    adaptiveVibeEnabled = !!enabled;
    if (settingsAdaptiveVibeToggle) {
      settingsAdaptiveVibeToggle.checked = adaptiveVibeEnabled;
      settingsAdaptiveVibeToggle.setAttribute("aria-checked", adaptiveVibeEnabled ? "true" : "false");
    }
    if (persist) {
      localStorage.setItem("lp:adaptiveVibe", adaptiveVibeEnabled ? "1" : "0");
    }
    refreshAdaptiveVibeFromCurrentMedia();
  }

  function updateBackgroundControlState() {
    const hasImage = !!backgroundImageData;
    const hasVideo = backgroundMediaType === "video" && !!backgroundVideoSource;
    const hasMedia = hasImage || hasVideo;
    const escapedDataUrl = hasImage ? backgroundImageData.replace(/"/g, '\\"') : "";
    if (settingsBackgroundClearButton) {
      settingsBackgroundClearButton.disabled = !hasMedia;
    }
    if (settingsBackgroundDimRange) {
      settingsBackgroundDimRange.disabled = !hasMedia;
      settingsBackgroundDimRange.value = String(backgroundImageDim);
    }
    if (settingsBackgroundBlurRange) {
      settingsBackgroundBlurRange.disabled = !hasMedia;
      settingsBackgroundBlurRange.value = String(backgroundImageBlur);
    }
    if (settingsBackgroundDimValue) {
      settingsBackgroundDimValue.textContent = `${backgroundImageDim}%`;
    }
    if (settingsBackgroundBlurValue) {
      settingsBackgroundBlurValue.textContent = `${backgroundImageBlur}px`;
    }
    if (settingsBackgroundPreview) {
      let previewImage = "linear-gradient(135deg, #171b25 0%, #10131a 60%, #121827 100%)";
      if (hasImage) {
        previewImage = `url("${escapedDataUrl}")`;
      } else if (hasVideo) {
        previewImage = "linear-gradient(135deg, #0f172a 0%, #1e293b 52%, #0b1120 100%)";
      }
      settingsBackgroundPreview.style.setProperty("--settings-bg-preview-image", previewImage);
      settingsBackgroundPreview.style.setProperty("--settings-bg-preview-dim", String(backgroundImageDim / 100));
      settingsBackgroundPreview.style.setProperty("--settings-bg-preview-blur", `${Math.round(backgroundImageBlur * 0.6)}px`);
      settingsBackgroundPreview.classList.toggle("has-image", hasImage);
      settingsBackgroundPreview.classList.toggle("has-video", hasVideo);
    }
    if (settingsBackgroundPreviewVideo) {
      const currentSrc = settingsBackgroundPreviewVideo.getAttribute("src") || "";
      if (hasVideo) {
        settingsBackgroundPreviewVideo.muted = true;
        settingsBackgroundPreviewVideo.defaultMuted = true;
        settingsBackgroundPreviewVideo.loop = true;
        settingsBackgroundPreviewVideo.autoplay = true;
        settingsBackgroundPreviewVideo.playsInline = true;
        if (currentSrc !== backgroundVideoSource) {
          settingsBackgroundPreviewVideo.setAttribute("src", backgroundVideoSource);
          settingsBackgroundPreviewVideo.load();
        }
        const playPromise = settingsBackgroundPreviewVideo.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      } else if (currentSrc) {
        settingsBackgroundPreviewVideo.pause();
        settingsBackgroundPreviewVideo.removeAttribute("src");
        settingsBackgroundPreviewVideo.load();
      }
    }
    if (settingsBackgroundPreviewCaption) {
      if (hasVideo) {
        settingsBackgroundPreviewCaption.textContent = t("settings.backgroundPreviewVideo");
      } else if (hasImage) {
        settingsBackgroundPreviewCaption.textContent = t("settings.backgroundPreviewReady");
      } else {
        settingsBackgroundPreviewCaption.textContent = t("settings.backgroundPreviewEmpty");
      }
    }
  }

  function applyBackgroundImage() {
    const hasImage = !!backgroundImageData;
    const hasVideo = backgroundMediaType === "video" && !!backgroundVideoSource;
    const hasMedia = hasImage || hasVideo;
    const imageUrl = hasImage
      ? `url("${backgroundImageData.replace(/"/g, '\\"')}")`
      : "none";
    document.documentElement.style.setProperty("--app-bg-image", imageUrl);
    document.documentElement.style.setProperty("--app-bg-dim", String(backgroundImageDim / 100));
    document.documentElement.style.setProperty("--app-bg-blur", `${backgroundImageBlur}px`);
    document.body.classList.toggle("has-background-image", hasImage);
    document.body.classList.toggle("has-background-video", hasVideo);
    document.body.classList.toggle("has-background-media", hasMedia);
    if (appBackgroundVideo) {
      appBackgroundVideo.muted = true;
      appBackgroundVideo.defaultMuted = true;
      appBackgroundVideo.loop = true;
      appBackgroundVideo.autoplay = true;
      appBackgroundVideo.playsInline = true;
      const currentSrc = appBackgroundVideo.getAttribute("src") || "";
      if (hasVideo) {
        if (currentSrc !== backgroundVideoSource) {
          appBackgroundVideo.setAttribute("src", backgroundVideoSource);
          appBackgroundVideo.load();
        }
        const playPromise = appBackgroundVideo.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      } else if (currentSrc) {
        appBackgroundVideo.pause();
        appBackgroundVideo.removeAttribute("src");
        appBackgroundVideo.load();
      }
    }
    updateBackgroundControlState();
    refreshAdaptiveVibeFromCurrentMedia();
  }

  function persistBackgroundImageSettings() {
    try {
      const persistedMediaType = backgroundMediaType === "video" && backgroundVideoPath
        ? "video"
        : (backgroundImageData ? "image" : "");
      if (backgroundImageData) {
        localStorage.setItem("lp:bgImageData", backgroundImageData);
      } else {
        localStorage.removeItem("lp:bgImageData");
      }
      if (backgroundVideoPath) {
        localStorage.setItem("lp:bgVideoPath", backgroundVideoPath);
      } else {
        localStorage.removeItem("lp:bgVideoPath");
      }
      if (persistedMediaType) {
        localStorage.setItem("lp:bgMediaType", persistedMediaType);
      } else {
        localStorage.removeItem("lp:bgMediaType");
      }
      localStorage.setItem("lp:bgImageDim", String(backgroundImageDim));
      localStorage.setItem("lp:bgImageBlur", String(backgroundImageBlur));
    } catch (_error) {
      showErrorToast("Background media could not be saved.");
    }
  }

  function setBackgroundDim(value) {
    backgroundImageDim = normalizeInt(value, 20, 85, 55);
    applyBackgroundImage();
    persistBackgroundImageSettings();
  }

  function setBackgroundBlur(value) {
    backgroundImageBlur = normalizeInt(value, 0, 20, 0);
    applyBackgroundImage();
    persistBackgroundImageSettings();
  }

  function clearBackgroundImage() {
    releaseBackgroundVideoObjectUrl();
    backgroundImageData = "";
    backgroundMediaType = "";
    backgroundVideoSource = "";
    backgroundVideoPath = "";
    applyBackgroundImage();
    persistBackgroundImageSettings();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Failed to read selected file."));
      reader.readAsDataURL(file);
    });
  }

  function optimizeBackgroundImage(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxEdge = 1920;
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        if (scale >= 1 && dataUrl.length < 1_800_000) {
          resolve(dataUrl);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async function pickBackgroundImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif,image/bmp,video/mp4,video/webm,video/ogg,video/quicktime";
    input.click();
    await new Promise((resolve) => {
      input.addEventListener("change", resolve, { once: true });
    });
    const file = input.files && input.files[0] ? input.files[0] : null;
    if (!file) return;
    try {
      if (isVideoBackgroundFile(file)) {
        const rawPath = typeof file.path === "string" ? file.path.trim() : "";
        releaseBackgroundVideoObjectUrl();
        backgroundImageData = "";
        backgroundMediaType = "video";
        backgroundVideoPath = rawPath;
        backgroundVideoSource = URL.createObjectURL(file);
        backgroundVideoObjectUrl = backgroundVideoSource;
        if (!rawPath) {
          showNotification(t("toast.backgroundVideoTemporary"));
        }
        applyBackgroundImage();
        persistBackgroundImageSettings();
        return;
      }
      const rawDataUrl = await readFileAsDataUrl(file);
      if (!rawDataUrl) return;
      releaseBackgroundVideoObjectUrl();
      backgroundVideoPath = "";
      backgroundVideoSource = "";
      backgroundMediaType = "image";
      backgroundImageData = await optimizeBackgroundImage(rawDataUrl);
      applyBackgroundImage();
      persistBackgroundImageSettings();
    } catch (error) {
      const message = error?.message || "Failed to set background image.";
      showErrorToast(message);
    }
  }

  function applyExampleBackground() {
    releaseBackgroundVideoObjectUrl();
    backgroundImageData = "";
    backgroundMediaType = "video";
    backgroundVideoPath = `${BUILTIN_BG_VIDEO_PREFIX}${BUILTIN_BG_VIDEO_FILE}`;
    backgroundVideoSource = resolveBackgroundVideoSource(backgroundVideoPath);
    if (!backgroundVideoSource) {
      showErrorToast("Example video could not be loaded.");
      return;
    }
    applyBackgroundImage();
    persistBackgroundImageSettings();
  }

  function setFontSizePreset(value) {
    if (!editor) return;
    const mapping = {
      Small: "0.95rem",
      Default: "1rem",
      Large: "1.15rem"
    };
    const size = mapping[value] || mapping.Default;
    editor.style.fontSize = size;
    localStorage.setItem("lp:fontSize", value);
    captureEditorBaseMetrics();
    applyEditorZoom();
    plainEditorInstance?.updateMetricsFromEditor();
    plainEditorInstance?.resizeCanvas();
    plainEditorInstance?.scheduleRender();
  }

  function captureEditorBaseMetrics() {
    if (!editor) return;
    const style = getComputedStyle(editor);
    const fontSize = parseFloat(style.fontSize);
    if (Number.isFinite(fontSize)) {
      baseEditorFontSize = fontSize;
    }
    const lineHeight = parseFloat(style.lineHeight);
    if (Number.isFinite(lineHeight)) {
      baseEditorLineHeight = lineHeight;
    } else {
      baseEditorLineHeight = Math.round(baseEditorFontSize * 1.6);
    }
  }

  function applyEditorZoom() {
    if (!editor) return;
    const size = baseEditorFontSize * editorZoom;
    const lineHeight = baseEditorLineHeight * editorZoom;
    editor.style.fontSize = `${size}px`;
    editor.style.lineHeight = `${lineHeight}px`;
    plainEditorInstance?.updateMetricsFromEditor();
    plainEditorInstance?.resizeCanvas();
    plainEditorInstance?.scheduleRender();
  }

  function setEditorZoom(next) {
    const clamped = Math.min(1.6, Math.max(0.7, next));
    editorZoom = clamped;
    localStorage.setItem("lp:editorZoom", String(editorZoom));
    applyEditorZoom();
  }

  const i18n = {
    English: {
      menu: {
        file: "File",
        edit: "Edit",
        view: "View",
        more: "More"
      },
      menuItem: {
        newFile: "New",
        open: "Open...",
        save: "Save",
        saveAs: "Save As...",
        trash: "Trash",
        closeTab: "Close Tab",
        quit: "Quit",
        undo: "Undo",
        redo: "Redo",
        cut: "Cut",
        copy: "Copy",
        paste: "Paste",
        selectAll: "Select All",
        find: "Find",
        replace: "Replace",
        wordWrap: "Toggle Word Wrap",
        zoomIn: "Zoom In",
        zoomOut: "Zoom Out",
        zoomReset: "Zoom Reset",
        fullscreen: "Toggle Fullscreen",
        viewMode: "Toggle View Mode",
        about: "About",
        changelog: "Changelog"
      },
      header: {
        search: "Search all files",
        sidePanel: "Side Panel",
        viewMode: "View Mode",
        settings: "Settings",
        newTab: "New Tab"
      },
      tab: {
        untitled: "Untitled"
      },
        toolbar: {
          headings: "Headings",
          lists: "Lists",
          title: "Title",
          subtitle: "Subtitle",
          heading: "Heading",
          subheading: "Subheading",
          section: "Section",
          subsection: "Subsection",
          body: "Body",
          bulletList: "Bullet List",
          numberedList: "Numbered List",
          bold: "Bold",
          italic: "Italic",
          underline: "Underline",
          strike: "Strike",
          code: "Code",
          highlight: "Highlight",
          alignLeft: "Align Left",
          alignCenter: "Align Center",
          alignRight: "Align Right",
          insertLink: "Insert Link",
          blockquote: "Blockquote",
          horizontalRule: "Horizontal Rule",
          table: "Table",
          addRow: "Add Row",
          addColumn: "Add Column",
          deleteTable: "Delete Table",
          subscript: "Subscript",
          superscript: "Superscript",
          textColor: "Text Color",
          highlightColor: "Background Color",
          undo: "Undo",
          redo: "Redo",
          clearFormatting: "Clear Formatting",
          wordWrap: "Word Wrap",
        },
      viewMode: {
        exit: "Turn off View Mode"
      },
      trash: {
        title: "Trash",
        clear: "Clear All",
        empty: "Trash is empty.",
        restore: "Restore",
        delete: "Delete",
        unsaved: "Unsaved",
        footer: "Closed tabs are kept locally on this device.",
        close: "Close"
      },
      panel: {
        sideTitle: "Side Panel",
        outline: "Outline",
        backlinks: "Backlinks",
        tags: "Tags",
        noteInfo: "Note info",
        noHeadings: "No headings found.",
        noTags: "No tags",
        headingFallback: "Heading",
        words: "Words",
        characters: "Characters",
        readingTime: "Reading time",
        minutes: "min",
        lastEdited: "Last edited",
        tagLabel: "Tag"
      },
      settings: {
        title: "Settings",
        general: "General",
        editor: "Editor",
        appearance: "Appearance",
        files: "Files & Save",
        notifications: "Notifications",
        reset: "Reset",
        footer: "Settings are applied immediately.",
        autoUpdate: "Check for updates automatically",
        autoUpdateHint: "Keep LucidPad up to date",
        language: "Language",
        languageHint: "Select app language",
        startup: "Launch on startup",
        startupHint: "Start with system",
        welcomeTips: "Show welcome tips",
        welcomeTipsHint: "A quick tips card on startup",
        startTour: "Start tour",
        plainMode: "Plain Text Mode",
        plainModeHint: "Optimized for huge files",
        autosave: "Auto-save",
        autosaveHint: "Save changes periodically",
        autosaveInterval: "Auto-save interval",
        autosaveIntervalHint: "How often to save",
        spellcheck: "Spell check",
        spellcheckHint: "Underline misspellings",
        fontSize: "Font size",
        fontSizeHint: "Editor text scale",
        wordWrap: "Word wrap",
        wordWrapHint: "Wrap long lines",
        lineHighlight: "Highlight current line",
        lineHighlightHint: "Soft line highlight",
        accent: "Accent color",
        accentHint: "UI highlight",
        backgroundImage: "Background media",
        backgroundImageHint: "Choose an image or MP4 background",
        backgroundChoose: "Choose media",
        backgroundExample: "EXAMPLE",
        backgroundClear: "Clear",
        backgroundDim: "Background dim",
        backgroundDimHint: "Dark overlay over the image",
        backgroundBlur: "Background blur",
        backgroundBlurHint: "Blur amount for readability",
        adaptiveVibe: "Adaptive vibe",
        adaptiveVibeHint: "Blend UI dark tones with your background media",
        adaptiveAccent: "Accent suggestion",
        adaptiveAccentHint: "Suggest accent color from dominant background tone",
        adaptiveAccentUse: "Use dominant accent",
        backgroundPreview: "Background preview",
        backgroundPreviewHint: "Small preview of your current background",
        backgroundPreviewEmpty: "No media selected",
        backgroundPreviewReady: "Image preview",
        backgroundPreviewVideo: "MP4 video selected",
        reduceMotion: "Reduce motion",
        reduceMotionHint: "Minimize animations",
        blurEffects: "Blur effects",
        blurEffectsHint: "Glass surfaces",
        confirmOverwrite: "Confirm before overwrite",
        confirmOverwriteHint: "Ask before replacing files",
        exportFolder: "Default export folder",
        exportFolderHint: "Exports will open in this folder",
        updateNotifications: "Update notifications",
        updateNotificationsHint: "Show update alerts",
        errorToasts: "Error toasts",
        errorToastsHint: "Show error messages",
        resetLabel: "Reset all settings",
        resetHint: "Danger zone",
        resetButton: "Reset"
      },
      about: {
        description: "Still in progress. More coming soon.",
        authorLabel: "Author",
        checkUpdates: "Check for updates",
        ok: "OK",
        versionLabel: "Version"
      },
      find: {
        placeholder: "Find"
      },
      welcome: {
        title: "Welcome to LucidPad",
        text: "A few quick tips to get you started:",
        tip1: "Use the toolbar for headings and lists.",
        tip2: "Press Ctrl+F to search your note.",
        tip3: "Side Panel shows Outline, tags, and note info.",
        startTour: "Start tour",
        close: "Got it"
      },
      onboard: {
        title: "Quick setup",
        subtitle: "Choose a few basics before we start.",
        progress: "Step {current} of {total}",
        languageTitle: "Choose language",
        languageDesc: "Pick the language for menus and tips.",
        accentTitle: "Choose accent color",
        accentDesc: "Set the highlight color for buttons and focus.",
        back: "Back",
        next: "Next",
        continue: "Continue",
        languages: {
          English: "English",
          Mongolian: "Mongolian",
          Japanese: "Japanese"
        },
        colors: {
          blue: "Blue",
          green: "Green",
          purple: "Purple",
          orange: "Orange",
          red: "Red",
          teal: "Teal"
        }
      },
      tour: {
        title: "Tour",
        back: "Back",
        skip: "Skip",
        next: "Next",
        finish: "Finish",
        steps: {
          menu: {
            title: "Menu Bar",
            description: "File, Edit, View, and More are all here."
          },
          tabs: {
            title: "Tabs",
            description: "Create and switch between notes."
          },
          editor: {
            title: "Editor",
            description: "This is your writing space."
          },
          formatting: {
            title: "Formatting",
            description: "Quick formatting tools for headings and lists."
          },
          search: {
            title: "Search",
            description: "Find text across your note."
          },
          sidePanel: {
            title: "Side Panel",
            description: "Outline, tags, and note info live here."
          },
          settings: {
            title: "Settings",
            description: "Personalize LucidPad."
          }
        }
      },
      activity: {
        empty: "No activity yet.",
        retry: "Retry"
      },
      autosave: {
        inProgress: "Auto-save in progress",
        complete: "Auto-save complete"
      },
      save: {
        changesTitle: "Save changes?",
        changesMessage: "This note has unsaved changes.",
        changesCancel: "Cancel",
        changesDontSave: "Don't save",
        changesSave: "Save",
        tabUnsaved: "This tab has unsaved changes.",
        overwriteMessage: "Overwrite \"{name}\"? This will replace the existing file.",
        formatTitle: "Save as",
        formatMessage: "Choose a format for this note.",
        formatHint: "Rich formatting detected. Markdown keeps headings, lists, links, and emphasis. Text removes formatting.",
        cancel: "Cancel",
        text: "Text (.txt)",
        markdown: "Markdown (.md)"
      },
      toast: {
        downloadComplete: "Download complete",
        openFile: "Open file",
        showInFolder: "Show in folder",
        undo: "Undo",
        tabClosed: "Tab closed",
        settingsReset: "Settings reset to defaults.",
        checkingUpdates: "Checking for updates...",
        changelogCopied: "Changelog copied.",
        tourTargetsMissing: "Tour targets not found.",
        autosaveFailed: "Auto-save failed",
        downloadFailed: "Download failed",
        updateReadyRestart: "Update ready. Restarting...",
        updateFailed: "Update failed",
        restoreFailed: "Restore failed",
        restoreFailedWithReason: "Restore failed: {error}",
        backgroundVideoTemporary: "Video background is temporary and will reset after restart."
      },
      footer: {
        autoSave: "Auto-Save",
        on: "On",
        off: "Off",
        session: "Session",
        line: "Ln",
        column: "Col",
        chars: "chars"
      }
    },
    Japanese: {
      menu: {
        file: "ファイル",
        edit: "編集",
        view: "表示",
        more: "その他"
      },
      menuItem: {
        newFile: "新規",
        open: "開く...",
        save: "保存",
        saveAs: "名前を付けて保存...",
        trash: "ゴミ箱",
        closeTab: "タブを閉じる",
        quit: "終了",
        undo: "元に戻す",
        redo: "やり直し",
        cut: "切り取り",
        copy: "コピー",
        paste: "貼り付け",
        selectAll: "すべて選択",
        find: "検索",
        replace: "置換",
        wordWrap: "折り返し切替",
        zoomIn: "拡大",
        zoomOut: "縮小",
        zoomReset: "ズームをリセット",
        fullscreen: "全画面表示切替",
        viewMode: "表示モード切替",
        about: "このアプリについて",
        changelog: "変更履歴"
      },
      header: {
        search: "すべてのファイルを検索",
        sidePanel: "サイドパネル",
        viewMode: "表示モード",
        settings: "設定",
        newTab: "新しいタブ"
      },
      tab: {
        untitled: "無題"
      },
      toolbar: {
        headings: "見出し",
        lists: "リスト",
        title: "タイトル",
        subtitle: "サブタイトル",
        heading: "見出し",
        subheading: "小見出し",
        section: "セクション",
        subsection: "サブセクション",
        body: "本文",
        bulletList: "箇条書き",
        numberedList: "番号付きリスト",
        bold: "太字",
        italic: "斜体",
        underline: "下線",
        strike: "取り消し線",
        code: "コード",
        highlight: "ハイライト",
        alignLeft: "左揃え",
        alignCenter: "中央揃え",
        alignRight: "右揃え",
        insertLink: "リンクを挿入",
        blockquote: "引用",
        horizontalRule: "水平線",
        table: "表",
        addRow: "行を追加",
        addColumn: "列を追加",
        deleteTable: "表を削除",
        subscript: "下付き",
        superscript: "上付き",
        textColor: "文字色",
        highlightColor: "背景色",
        undo: "元に戻す",
        redo: "やり直し",
        clearFormatting: "書式をクリア",
        wordWrap: "折り返し"
      },
      viewMode: {
        exit: "表示モードを終了"
      },
      trash: {
        title: "ゴミ箱",
        clear: "すべて削除",
        empty: "ゴミ箱は空です。",
        restore: "復元",
        delete: "削除",
        unsaved: "未保存",
        footer: "閉じたタブはこの端末に保存されます。",
        close: "閉じる"
      },
      panel: {
        sideTitle: "サイドパネル",
        outline: "アウトライン",
        backlinks: "バックリンク",
        tags: "タグ",
        noteInfo: "ノート情報",
        noHeadings: "見出しが見つかりません。",
        noTags: "タグなし",
        headingFallback: "見出し",
        words: "単語数",
        characters: "文字数",
        readingTime: "読了時間",
        minutes: "分",
        lastEdited: "最終編集",
        tagLabel: "タグ"
      },
      settings: {
        title: "設定",
        general: "一般",
        editor: "エディター",
        appearance: "外観",
        files: "ファイルと保存",
        notifications: "通知",
        reset: "リセット",
        footer: "設定はすぐに適用されます。",
        autoUpdate: "自動でアップデートを確認",
        autoUpdateHint: "LucidPadを最新の状態に保つ",
        language: "言語",
        languageHint: "アプリの言語を選択",
        startup: "起動時に開始",
        startupHint: "システム起動時に開始",
        welcomeTips: "ウェルカムヒントを表示",
        welcomeTipsHint: "起動時にクイックヒントを表示",
        startTour: "ツアーを開始",
        plainMode: "プレーンテキストモード",
        plainModeHint: "巨大ファイル向けに最適化",
        autosave: "自動保存",
        autosaveHint: "定期的に変更を保存",
        autosaveInterval: "自動保存間隔",
        autosaveIntervalHint: "保存する頻度",
        spellcheck: "スペルチェック",
        spellcheckHint: "誤字を下線表示",
        fontSize: "フォントサイズ",
        fontSizeHint: "エディター文字サイズ",
        wordWrap: "折り返し",
        wordWrapHint: "長い行を折り返す",
        lineHighlight: "現在行をハイライト",
        lineHighlightHint: "現在行を薄く強調",
        accent: "アクセント色",
        accentHint: "UIの強調色",
        backgroundImage: "背景メディア",
        backgroundImageHint: "画像またはMP4を背景に設定",
        backgroundChoose: "メディアを選択",
        backgroundExample: "例",
        backgroundClear: "クリア",
        backgroundDim: "背景の暗さ",
        backgroundDimHint: "画像に暗いオーバーレイを適用",
        backgroundBlur: "背景ぼかし",
        backgroundBlurHint: "読みやすさのためのぼかし量",
        adaptiveVibe: "Adaptive vibe",
        adaptiveVibeHint: "背景メディアに合わせてUIの暗色を調整",
        adaptiveAccent: "アクセント提案",
        adaptiveAccentHint: "背景の主要色からアクセント色を提案",
        adaptiveAccentUse: "提案色を使う",
        backgroundPreview: "背景プレビュー",
        backgroundPreviewHint: "現在の背景の小さなプレビュー",
        backgroundPreviewEmpty: "メディアが選択されていません",
        backgroundPreviewReady: "画像プレビュー",
        backgroundPreviewVideo: "MP4動画が選択済み",
        reduceMotion: "モーションを減らす",
        reduceMotionHint: "アニメーションを最小化",
        blurEffects: "ぼかし効果",
        blurEffectsHint: "ガラス風UI",
        confirmOverwrite: "上書き前に確認",
        confirmOverwriteHint: "ファイル置換前に確認する",
        exportFolder: "既定のエクスポート先",
        exportFolderHint: "エクスポートはこのフォルダを開きます",
        updateNotifications: "更新通知",
        updateNotificationsHint: "更新アラートを表示",
        errorToasts: "エラートースト",
        errorToastsHint: "エラーメッセージを表示",
        resetLabel: "設定をすべてリセット",
        resetHint: "注意が必要",
        resetButton: "リセット"
      },
      about: {
        description: "開発中です。今後さらに機能を追加予定です。",
        authorLabel: "作者",
        checkUpdates: "アップデートを確認",
        ok: "OK",
        versionLabel: "バージョン"
      },
      find: {
        placeholder: "検索"
      },
      welcome: {
        title: "LucidPadへようこそ",
        text: "はじめる前のクイックヒント:",
        tip1: "ツールバーで見出しやリストを使えます。",
        tip2: "Ctrl+Fでノート内を検索できます。",
        tip3: "サイドパネルでアウトライン、タグ、ノート情報を確認できます。",
        startTour: "ツアーを開始",
        close: "了解"
      },
      onboard: {
        title: "クイック設定",
        subtitle: "開始前に基本設定を選択します。",
        progress: "ステップ {current} / {total}",
        languageTitle: "言語を選択",
        languageDesc: "メニューとヒントの言語を選択します。",
        accentTitle: "アクセント色を選択",
        accentDesc: "ボタンとフォーカスの強調色を設定します。",
        back: "戻る",
        next: "次へ",
        continue: "続行",
        languages: {
          English: "英語",
          Mongolian: "モンゴル語",
          Japanese: "日本語"
        },
        colors: {
          blue: "青",
          green: "緑",
          purple: "紫",
          orange: "オレンジ",
          red: "赤",
          teal: "ティール"
        }
      },
      tour: {
        title: "ツアー",
        back: "戻る",
        skip: "スキップ",
        next: "次へ",
        finish: "完了",
        steps: {
          menu: {
            title: "メニューバー",
            description: "File、Edit、View、More はここにあります。"
          },
          tabs: {
            title: "タブ",
            description: "ノートを作成して切り替えできます。"
          },
          editor: {
            title: "エディター",
            description: "ここが文章を書く場所です。"
          },
          formatting: {
            title: "書式",
            description: "見出しやリストのクイック書式ツールです。"
          },
          search: {
            title: "検索",
            description: "ノート内のテキストを検索します。"
          },
          sidePanel: {
            title: "サイドパネル",
            description: "アウトライン、タグ、ノート情報を表示します。"
          },
          settings: {
            title: "設定",
            description: "LucidPadを自分向けにカスタマイズします。"
          }
        }
      },
      activity: {
        empty: "まだアクティビティはありません。",
        retry: "再試行"
      },
      autosave: {
        inProgress: "自動保存中",
        complete: "自動保存が完了しました"
      },
      save: {
        changesTitle: "変更を保存しますか？",
        changesMessage: "このノートには未保存の変更があります。",
        changesCancel: "キャンセル",
        changesDontSave: "保存しない",
        changesSave: "保存",
        tabUnsaved: "このタブには未保存の変更があります。",
        overwriteMessage: "\"{name}\" を上書きしますか？既存ファイルは置き換えられます。",
        formatTitle: "名前を付けて保存",
        formatMessage: "このノートの保存形式を選択してください。",
        formatHint: "リッチ書式が検出されました。Markdownは見出し、リスト、リンク、強調を保持します。Textは書式を削除します。",
        cancel: "キャンセル",
        text: "テキスト (.txt)",
        markdown: "Markdown (.md)"
      },
      toast: {
        downloadComplete: "ダウンロード完了",
        openFile: "ファイルを開く",
        showInFolder: "フォルダで表示",
        undo: "元に戻す",
        tabClosed: "タブを閉じました",
        settingsReset: "設定を既定値に戻しました。",
        checkingUpdates: "アップデートを確認中...",
        changelogCopied: "変更履歴をコピーしました。",
        tourTargetsMissing: "ツアー対象が見つかりません。",
        autosaveFailed: "自動保存に失敗しました",
        downloadFailed: "ダウンロードに失敗しました",
        updateReadyRestart: "更新の準備ができました。再起動しています...",
        updateFailed: "アップデートに失敗しました",
        restoreFailed: "復元に失敗しました",
        restoreFailedWithReason: "復元に失敗しました: {error}",
        backgroundVideoTemporary: "動画背景は一時的です。再起動後にリセットされます。"
      },
      footer: {
        autoSave: "自動保存",
        on: "オン",
        off: "オフ",
        session: "セッション",
        line: "行",
        column: "列",
        chars: "文字"
      }
    },
Mongolian: {
  menu: {
    file: "Ð¤Ð°Ð¹Ð»",
    edit: "Ð—Ð°ÑÐ²Ð°Ñ€Ð»Ð°Ñ…",
    view: "Ð¥Ð°Ñ€Ð°Ñ…",
    more: "ÐÑÐ¼ÑÐ»Ñ‚"
  },
  menuItem: {
    newFile: "Ð¨Ð¸Ð½Ñ Ñ„Ð°Ð¹Ð»",
    open: "ÐÑÑÑ…â€¦",
    save: "Ð¥Ð°Ð´Ð³Ð°Ð»Ð°Ñ…",
    saveAs: "Ó¨Ó©Ñ€ Ð½ÑÑ€ÑÑÑ€ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ñ…â€¦",
    trash: "Ð¥Ð¾Ð³Ð¸Ð¹Ð½ ÑÐ°Ð²",
    closeTab: "Ð¢Ð°Ð± Ñ…Ð°Ð°Ñ…",
    quit: "Ð“Ð°Ñ€Ð°Ñ…",
    undo: "Ð‘ÑƒÑ†Ð°Ð°Ñ…",
    redo: "Ð”Ð°Ñ…Ð¸Ð½ Ñ…Ð¸Ð¹Ñ…",
    cut: "Ð¢Ð°ÑÐ»Ð°Ñ…",
    copy: "Ð¥ÑƒÑƒÐ»Ð°Ñ…",
    paste: "Ð‘ÑƒÑƒÐ»Ð³Ð°Ñ…",
    selectAll: "Ð‘Ò¯Ð³Ð´Ð¸Ð¹Ð³ ÑÐ¾Ð½Ð³Ð¾Ñ…",
    find: "Ð¥Ð°Ð¹Ñ…",
    replace: "ÐžÑ€Ð»ÑƒÑƒÐ»Ð°Ñ…",
    wordWrap: "ÐœÓ©Ñ€ Ð½ÑƒÐ³Ð°Ð»Ð°Ñ… (Word Wrap)",
    zoomIn: "Ð¢Ð¾Ð¼Ñ€ÑƒÑƒÐ»Ð°Ñ… (Zoom In)",
    zoomOut: "Ð–Ð¸Ð¶Ð¸Ð³Ñ€Ò¯Ò¯Ð»ÑÑ… (Zoom Out)",
    zoomReset: "Ð¥ÑÐ¼Ð¶ÑÑÐ³ Ñ…ÑÐ²Ð¸Ð¹Ð½ Ð±Ð¾Ð»Ð³Ð¾Ñ… (Zoom Reset)",
    fullscreen: "Ð‘Ò¯Ñ‚ÑÐ½ Ð´ÑÐ»Ð³ÑÑ†",
    viewMode: "Ð¥Ð°Ñ€Ð°Ð³Ð´Ð°Ñ† ÑÐ¾Ð»Ð¸Ñ…",
    about: "Ð¢ÑƒÑ…Ð°Ð¹",
    changelog: "Ó¨Ó©Ñ€Ñ‡Ð»Ó©Ð»Ñ‚Ð¸Ð¹Ð½ Ñ‚Ò¯Ò¯Ñ…"
  },
  header: {
    search: "Ð‘Ò¯Ñ… Ñ„Ð°Ð¹Ð»ÑƒÑƒÐ´Ð°Ð°Ñ Ñ…Ð°Ð¹Ñ…",
    sidePanel: "Ð¥Ð°Ð¶ÑƒÑƒ ÑÐ°Ð¼Ð±Ð°Ñ€",
    viewMode: "Ð¥Ð°Ñ€Ð°Ð³Ð´Ð°Ñ†",
    settings: "Ð¢Ð¾Ñ…Ð¸Ñ€Ð³Ð¾Ð¾",
    newTab: "Ð¨Ð¸Ð½Ñ Ñ‚Ð°Ð±"
  },
  tab: {
    untitled: "ÐÑÑ€Ð³Ò¯Ð¹"
  },
    toolbar: {
      headings: "Ð“Ð°Ñ€Ñ‡Ð¸Ð³",
      lists: "Ð–Ð°Ð³ÑÐ°Ð°Ð»Ñ‚",
      title: "Ð“Ð°Ñ€Ñ‡Ð¸Ð³ (Title)",
      subtitle: "Ð”ÑÐ´ Ð³Ð°Ñ€Ñ‡Ð¸Ð³",
      heading: "Ð“Ð°Ñ€Ñ‡Ð¸Ð³",
      subheading: "Ð”ÑÐ´ Ð³Ð°Ñ€Ñ‡Ð¸Ð³ (H4)",
      section: "Ð‘Ò¯Ð»ÑÐ³",
      subsection: "Ð”ÑÐ´ Ð±Ò¯Ð»ÑÐ³",
      body: "Ð­Ð½Ð³Ð¸Ð¹Ð½ Ñ‚ÐµÐºÑÑ‚",
      bulletList: "Ð¡ÑƒÐ¼Ñ‚Ð°Ð¹ Ð¶Ð°Ð³ÑÐ°Ð°Ð»Ñ‚",
      numberedList: "Ð”ÑƒÐ³Ð°Ð°Ñ€Ñ‚Ð°Ð¹ Ð¶Ð°Ð³ÑÐ°Ð°Ð»Ñ‚",
      bold: "Ð¢Ð¾Ð´",
      italic: "ÐÐ°Ð»ÑƒÑƒ",
      underline: "Ð”Ð¾Ð¾Ð³ÑƒÑƒÑ€ Ð·ÑƒÑ€Ð°Ð°ÑÑ‚Ð°Ð¹",
      strike: "Ð”ÑÑÐ³Ò¯Ò¯Ñ€ Ð·ÑƒÑ€Ð°Ð°ÑÑ‚Ð°Ð¹",
      code: "ÐšÐ¾Ð´",
      highlight: "Ð¢Ð¾Ð´Ñ€ÑƒÑƒÐ»Ð³Ð°",
      alignLeft: "Ð—Ò¯Ò¯Ð½ Ð·ÑÑ€ÑÐ³Ñ†Ò¯Ò¯Ð»ÑÑ…",
      alignCenter: "Ð“Ð¾Ð»Ð»ÑƒÑƒÐ»Ð°Ñ…",
      alignRight: "Ð‘Ð°Ñ€ÑƒÑƒÐ½ Ð·ÑÑ€ÑÐ³Ñ†Ò¯Ò¯Ð»ÑÑ…",
      insertLink: "Ð¥Ð¾Ð»Ð±Ð¾Ð¾Ñ Ð¾Ñ€ÑƒÑƒÐ»Ð°Ñ…",
      blockquote: "Ð˜ÑˆÐ»ÑÐ»",
      horizontalRule: "Ð¥ÑƒÐ²Ð°Ð°Ð³Ñ‡ ÑˆÑƒÐ³Ð°Ð¼",
      table: "Ð¥Ò¯ÑÐ½ÑÐ³Ñ‚",
      addRow: "ÐœÓ©Ñ€ Ð½ÑÐ¼ÑÑ…",
      addColumn: "Ð‘Ð°Ð³Ð°Ð½Ð° Ð½ÑÐ¼ÑÑ…",
      deleteTable: "Ð¥Ò¯ÑÐ½ÑÐ³Ñ‚ ÑƒÑÑ‚Ð³Ð°Ñ…",
      subscript: "Ð”Ð¾Ð¾Ð´ Ð¸Ð½Ð´ÐµÐºÑ",
      superscript: "Ð”ÑÑÐ´ Ð¸Ð½Ð´ÐµÐºÑ",
      textColor: "Ð¢ÐµÐºÑÑ‚Ð¸Ð¹Ð½ Ó©Ð½Ð³Ó©",
      highlightColor: "Ð”ÑÐ²ÑÐ³ÑÑ€ Ó©Ð½Ð³Ó©",
      undo: "Ð‘ÑƒÑ†Ð°Ð°Ñ…",
      redo: "Ð”Ð°Ñ…Ð¸Ð½ Ñ…Ð¸Ð¹Ñ…",
      clearFormatting: "Ð¤Ð¾Ñ€Ð¼Ð°Ñ‚ Ð°Ñ€Ð¸Ð»Ð³Ð°Ñ…",
      wordWrap: "ÐœÓ©Ñ€ Ð½ÑƒÐ³Ð°Ð»Ð°Ñ… (Word Wrap)",
    },
  viewMode: {
    exit: "Ð¥Ð°Ñ€Ð°Ð³Ð´Ð°Ñ† ÑƒÐ½Ñ‚Ñ€Ð°Ð°Ñ…"
  },
  panel: {
    sideTitle: "Ð¥Ð°Ð¶ÑƒÑƒ ÑÐ°Ð¼Ð±Ð°Ñ€",
    outline: "Ð‘Ò¯Ñ‚ÑÑ†",
    backlinks: "Ð¥Ð¾Ð»Ð±Ð¾Ð¾ÑÑƒÑƒÐ´",
    tags: "Ð¨Ð¾ÑˆÐ³Ð¾",
    noteInfo: "Ð¢ÑÐ¼Ð´ÑÐ³Ð»ÑÐ»Ð¸Ð¹Ð½ Ð¼ÑÐ´ÑÑÐ»ÑÐ»",
    noHeadings: "Ð“Ð°Ñ€Ñ‡Ð¸Ð³ Ð¾Ð»Ð´ÑÐ¾Ð½Ð³Ò¯Ð¹.",
    noTags: "Ð¨Ð¾ÑˆÐ³Ð¾ Ð°Ð»Ð³Ð°",
    headingFallback: "Ð“Ð°Ñ€Ñ‡Ð¸Ð³",
    words: "Ò®Ð³",
    characters: "Ð¢ÑÐ¼Ð´ÑÐ³Ñ‚",
    readingTime: "Ð£Ð½ÑˆÐ¸Ñ… Ñ…ÑƒÐ³Ð°Ñ†Ð°Ð°",
    minutes: "Ð¼Ð¸Ð½",
    lastEdited: "Ð¡Ò¯Ò¯Ð»Ð´ Ð·Ð°ÑÑÐ°Ð½",
    tagLabel: "Ð¨Ð¾ÑˆÐ³Ð¾"
  },
  settings: {
    title: "Ð¢Ð¾Ñ…Ð¸Ñ€Ð³Ð¾Ð¾",
    general: "Ð•Ñ€Ó©Ð½Ñ…Ð¸Ð¹",
    editor: "Ð¢ÐµÐºÑÑ‚ Ð·Ð°ÑÐ²Ð°Ñ€Ð»Ð°Ð³Ñ‡",
    appearance: "Ð¥Ð°Ñ€Ð°Ð³Ð´Ð°Ñ… Ð±Ð°Ð¹Ð´Ð°Ð»",
    files: "Ð¤Ð°Ð¹Ð» Ð±Ð° Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ð»Ñ‚",
    notifications: "ÐœÑÐ´ÑÐ³Ð´ÑÐ»",
    reset: "Ð¡ÑÑ€Ð³ÑÑÑ…",
    footer: "Ð¢Ð¾Ñ…Ð¸Ñ€Ð³Ð¾Ð¾Ð½Ñ‹ Ó©Ó©Ñ€Ñ‡Ð»Ó©Ð»Ñ‚ ÑˆÑƒÑƒÐ´ Ñ…ÑÑ€ÑÐ³Ð¶Ð¸Ð½Ñ.",
    autoUpdate: "Ð¨Ð¸Ð½ÑÑ‡Ð»ÑÐ»Ñ‚Ð¸Ð¹Ð³ Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð°Ð°Ñ€ ÑˆÐ°Ð»Ð³Ð°Ñ…",
    autoUpdateHint: "LucidPad-Ð³ Ò¯Ñ€Ð³ÑÐ»Ð¶ ÑˆÐ¸Ð½Ñ Ð±Ð°Ð¹Ð»Ð³Ð°Ñ…",
    language: "Ð¥ÑÐ»",
    languageHint: "ÐÐ¿Ð¿Ñ‹Ð½ Ñ…ÑÐ» ÑÐ¾Ð½Ð³Ð¾Ñ…",
    startup: "Ð­Ñ…Ð»Ò¯Ò¯Ð»ÑÑ… Ñ‚Ð¾Ñ…Ð¸Ñ€Ð³Ð¾Ð¾ (Launch on startup)",
    startupHint: "Ð¡Ð¸ÑÑ‚ÐµÐ¼ Ð°ÑÐ°Ñ…Ð°Ð´ Ñ…Ð°Ð¼Ñ‚ ÑÑ…Ð»Ò¯Ò¯Ð»ÑÑ…",
    welcomeTips: "Ð¨Ð¸Ð½Ñ Ñ…ÑÑ€ÑÐ³Ð»ÑÐ³Ñ‡Ð´ÑÐ´ Ð·Ð¾Ñ€Ð¸ÑƒÐ»ÑÐ°Ð½ Ñ‚Ð°Ð½Ð¸Ð»Ñ†ÑƒÑƒÐ»Ð³Ð° Ð·Ó©Ð²Ð»Ó©Ð¼Ð¶ Ñ…Ð°Ñ€ÑƒÑƒÐ»Ð°Ñ…",
    welcomeTipsHint: "Ð­Ñ…Ð»ÑÑ… Ò¯ÐµÐ´ Ñ‚Ð¾Ð²Ñ‡ Ð·Ó©Ð²Ð»Ó©Ð¼Ð¶ Ò¯Ð·Ò¯Ò¯Ð»ÑÑ…",
    startTour: "Ð¢Ð°Ð½Ð¸Ð»Ñ†ÑƒÑƒÐ»Ð³Ð° ÑÑ…Ð»Ò¯Ò¯Ð»ÑÑ…",
    plainMode: "Ð­Ð½Ð³Ð¸Ð¹Ð½ Ñ‚ÐµÐºÑÑ‚ Ð³Ð¾Ñ€Ð¸Ð¼",
    plainModeHint: "Ð¢Ð¾Ð¼ Ñ…ÑÐ¼Ð¶ÑÑÑ‚ÑÐ¹ Ñ„Ð°Ð¹Ð»Ð´ Ð¾Ð½Ð¾Ð²Ñ‡Ñ‚Ð¾Ð¹",
    autosave: "ÐÐ²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð°Ð°Ñ€ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ñ…",
    autosaveHint: "Ó¨Ó©Ñ€Ñ‡Ð»Ó©Ð»Ñ‚Ð¸Ð¹Ð³ Ñ‚Ð¾Ð³Ñ‚Ð¼Ð¾Ð» Ñ…Ð°Ð´Ð³Ð°Ð»Ð½Ð°",
    autosaveInterval: "ÐÐ²Ñ‚Ð¾ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ð»Ñ‚Ñ‹Ð½ Ð´Ð°Ð²Ñ‚Ð°Ð¼Ð¶",
    autosaveIntervalHint: "Ð¥ÑÐ´Ð¸Ð¹ Ñ…ÑƒÐ³Ð°Ñ†Ð°Ð°Ð½Ð´ Ð½ÑÐ³ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ñ…",
    spellcheck: "Ò®Ð³Ð¸Ð¹Ð½ Ð°Ð»Ð´Ð°Ð° ÑˆÐ°Ð»Ð³Ð°Ñ…",
    spellcheckHint: "ÐÐ»Ð´Ð°Ð°Ñ‚Ð°Ð¹ Ò¯Ð³Ð¸Ð¹Ð³ Ð´Ð¾Ð¾Ð³ÑƒÑƒÑ€ Ð·ÑƒÑ€Ð°Ñ…",
    fontSize: "Ð¤Ð¾Ð½Ñ‚Ñ‹Ð½ Ñ…ÑÐ¼Ð¶ÑÑ",
    fontSizeHint: "Ð¢ÐµÐºÑÑ‚ Ð·Ð°ÑÐ²Ð°Ñ€Ð»Ð°Ð³Ñ‡Ð¸Ð¹Ð½ Ð±Ð¸Ñ‡Ð²ÑÑ€Ð¸Ð¹Ð½ Ñ…ÑÐ¼Ð¶ÑÑ",
    wordWrap: "ÐœÓ©Ñ€ Ð½ÑƒÐ³Ð°Ð»Ð°Ñ… (Word Wrap)",
    wordWrapHint: "Ð£Ñ€Ñ‚ Ð¼Ó©Ñ€Ð¸Ð¹Ð³ Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð°Ð°Ñ€ Ð½ÑƒÐ³Ð°Ð»Ð°Ñ…",
    lineHighlight: "Ð˜Ð´ÑÐ²Ñ…Ñ‚ÑÐ¹ Ð¼Ó©Ñ€ Ñ‚Ð¾Ð´Ñ€ÑƒÑƒÐ»Ð°Ñ…",
    lineHighlightHint: "Ð˜Ð´ÑÐ²Ñ…Ñ‚ÑÐ¹ Ð¼Ó©Ñ€Ð¸Ð¹Ð³ highlight Ñ…Ð¸Ð¹Ñ…",
    accent: "Ó¨Ð½Ð³Ó©",
    accentHint: "UI Ó©Ð½Ð³Ó©",
    backgroundImage: "Ð”ÑÐ²ÑÐ³ÑÑ€ Ð¼ÐµÐ´Ð¸Ð°",
    backgroundImageHint: "Ð—ÑƒÑ€Ð°Ð³ ÑÑÐ²ÑÐ» MP4 Ð´ÑÐ²ÑÐ³ÑÑ€ ÑÐ¾Ð½Ð³Ð¾Ð½Ð¾",
    backgroundChoose: "ÐœÐµÐ´Ð¸Ð° ÑÐ¾Ð½Ð³Ð¾Ñ…",
    backgroundExample: "Ð–Ð˜Ð¨Ð­Ð­",
    backgroundClear: "ÐÑ€Ð¸Ð»Ð³Ð°Ñ…",
    backgroundDim: "Ð”ÑÐ²ÑÐ³ÑÑ€Ð¸Ð¹Ð½ Ð±Ð°Ñ€Ð°Ð°Ð½",
    backgroundDimHint: "Ð—ÑƒÑ€Ð³Ð°Ð½ Ð´ÑÑÑ€Ñ… Ð±Ð°Ñ€Ð°Ð°Ð½ Ð´Ð°Ð²Ñ…Ð°Ñ€Ð³Ð°",
    backgroundBlur: "Ð”ÑÐ²ÑÐ³ÑÑ€Ð¸Ð¹Ð½ blur",
    backgroundBlurHint: "Ð£Ð½ÑˆÐ¸Ñ…Ð°Ð´ Ñ…ÑÐ»Ð±Ð°Ñ€ Ð±Ð¾Ð»Ð³Ð¾Ñ… blur Ñ…ÑÐ¼Ð¶ÑÑ",
    adaptiveVibe: "Adaptive vibe",
    adaptiveVibeHint: "Ð”ÑÐ²ÑÐ³ÑÑ€ Ð¼ÐµÐ´Ð¸Ð°Ð³Ð°Ð°Ñ UI-Ð¸Ð¹Ð½ Ð±Ð°Ñ€Ð°Ð°Ð½ Ó©Ð½Ð³Ð¸Ð¹Ð³ Ñ‚Ð°Ð°Ñ€ÑƒÑƒÐ»Ð°Ñ…",
    adaptiveAccent: "Accent ÑÐ°Ð½Ð°Ð»",
    adaptiveAccentHint: "Ð”Ð¾Ð¼Ð¸Ð½Ð°Ð½Ñ‚ Ó©Ð½Ð³Ó©Ð½Ó©Ó©Ñ accent ÑÐ°Ð½Ð°Ð» Ð±Ð¾Ð»Ð³Ð¾Ñ…",
    adaptiveAccentUse: "Ð”Ð¾Ð¼Ð¸Ð½Ð°Ð½Ñ‚ accent Ð°ÑˆÐ¸Ð³Ð»Ð°Ñ…",
    backgroundPreview: "Ð”ÑÐ²ÑÐ³ÑÑ€ preview",
    backgroundPreviewHint: "ÐžÐ´Ð¾Ð¾Ð³Ð¸Ð¹Ð½ Ð´ÑÐ²ÑÐ³ÑÑ€Ð¸Ð¹Ð½ Ð¶Ð¸Ð¶Ð¸Ð³ preview",
    backgroundPreviewEmpty: "ÐœÐµÐ´Ð¸Ð° ÑÐ¾Ð½Ð³Ð¾Ð¾Ð³Ò¯Ð¹",
    backgroundPreviewReady: "Ð—ÑƒÑ€Ð°Ð³ preview",
    backgroundPreviewVideo: "MP4 Ð²Ð¸Ð´ÐµÐ¾ ÑÐ¾Ð½Ð³Ð¾Ð³Ð´ÑÐ¾Ð½",
    reduceMotion: "Ð¥Ó©Ð´Ó©Ð»Ð³Ó©Ó©Ð½ Ð±Ð°Ð³Ð°ÑÐ³Ð°Ñ…",
    reduceMotionHint: "ÐÐ½Ð¸Ð¼Ð°Ñ†Ð¸Ð¹Ð½ Ñ…Ó©Ð´Ó©Ð»Ð³Ó©Ó©Ð½Ð¸Ð¹Ð³ Ð±Ð°Ð³Ð°ÑÐ³Ð°Ñ…",
    blurEffects: "Ð‘Ò¯Ñ€ÑÐ»Ð·Ò¯Ò¯Ð»ÑÑ… ÑÑ„Ñ„ÐµÐºÑ‚",
    blurEffectsHint: "Ð¨Ð¸Ð»ÑÐ½/Ð±Ò¯Ñ€ÑÐ»Ð·ÑÑÐ½ ÑÑ„Ñ„ÐµÐºÑ‚ Ð°ÑˆÐ¸Ð³Ð»Ð°Ñ…",
    confirmOverwrite: "Ð”Ð°Ð²Ñ…Ð°Ñ€ Ð±Ð¸Ñ‡Ð¸Ñ…Ð¸Ð¹Ð½ Ó©Ð¼Ð½Ó© Ð±Ð°Ñ‚Ð°Ð»Ð³Ð°Ð°Ð¶ÑƒÑƒÐ»Ð°Ñ…",
    confirmOverwriteHint: "Ð¤Ð°Ð¹Ð» ÑÐ¾Ð»Ð¸Ñ…Ð¾Ð¾Ñ Ó©Ð¼Ð½Ó© Ð°ÑÑƒÑƒÑ…",
    exportFolder: "Ð­ÐºÑÐ¿Ð¾Ñ€Ñ‚Ñ‹Ð½ Ò¯Ð½Ð´ÑÑÐ½ Ñ…Ð°Ð²Ñ‚Ð°Ñ",
    exportFolderHint: "Ð­ÐºÑÐ¿Ð¾Ñ€Ñ‚ ÑÐ½Ñ Ñ…Ð°Ð²Ñ‚ÑÐ°Ð½Ð´ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ð³Ð´Ð°Ð½Ð°",
    updateNotifications: "Ð¨Ð¸Ð½ÑÑ‡Ð»ÑÐ»Ñ‚Ð¸Ð¹Ð½ Ð¼ÑÐ´ÑÐ³Ð´ÑÐ»",
    updateNotificationsHint: "Ð¨Ð¸Ð½ÑÑ‡Ð»ÑÐ»Ñ‚ Ð³Ð°Ñ€Ð²Ð°Ð» Ð¼ÑÐ´ÑÐ³Ð´ÑÑ…",
    errorToasts: "ÐÐ»Ð´Ð°Ð°Ð½Ñ‹ Ð¼ÑÐ´ÑÐ³Ð´ÑÐ»",
    errorToastsHint: "ÐÐ»Ð´Ð°Ð°Ð½Ñ‹ Ñ‚Ò¯Ñ€ Ð¼ÑÐ´ÑÐ³Ð´ÑÐ» Ñ…Ð°Ñ€ÑƒÑƒÐ»Ð°Ñ…",
    resetLabel: "Ð‘Ò¯Ñ… Ñ‚Ð¾Ñ…Ð¸Ñ€Ð³Ð¾Ð¾Ð³ ÑÑÑ€Ð³ÑÑÑ…",
    resetHint: "ÐÐ½Ñ…Ð°Ð°Ñ€ÑƒÑƒÐ»Ð³Ð°Ñ‚Ð°Ð¹ Ò¯Ð¹Ð»Ð´ÑÐ»",
    resetButton: "Ð¡ÑÑ€Ð³ÑÑÑ…"
  },
  find: {
    placeholder: "Ð¥Ð°Ð¹Ñ…"
  },
  welcome: {
    title: "LucidPad-Ð´ Ñ‚Ð°Ð²Ñ‚Ð°Ð¹ Ð¼Ð¾Ñ€Ð¸Ð»",
    text: "Ð­Ñ…Ð»ÑÑ…ÑÐ´ Ñ…ÑÑ€ÑÐ³Ñ‚ÑÐ¹ Ñ‚Ð¾Ð²Ñ‡ Ð·Ó©Ð²Ð»Ó©Ð¼Ð¶Ò¯Ò¯Ð´:",
    tip1: "Toolbar Ð°ÑˆÐ¸Ð³Ð»Ð°Ð½ Ð³Ð°Ñ€Ñ‡Ð¸Ð³ Ð±Ð¾Ð»Ð¾Ð½ Ð¶Ð°Ð³ÑÐ°Ð°Ð»Ñ‚ Ò¯Ò¯ÑÐ³ÑÑÑ€ÑÐ¹.",
    tip2: "Ctrl+F Ð´Ð°Ñ€Ð¶ Ñ‚ÑÐ¼Ð´ÑÐ³Ð»ÑÐ» Ð´Ð¾Ñ‚Ñ€Ð¾Ð¾ Ñ…Ð°Ð¹Ð»Ñ‚ Ñ…Ð¸Ð¹Ð½Ñ.",
    tip3: "Ð¥Ð°Ð¶ÑƒÑƒ ÑÐ°Ð¼Ð±Ð°Ñ€ Ð´ÑÑÑ€ Ð±Ò¯Ñ‚ÑÑ† (Outline), ÑˆÐ¾ÑˆÐ³Ð¾ (Tag) Ð±Ð¾Ð»Ð¾Ð½ Ð¼ÑÐ´ÑÑÐ»ÑÐ» Ñ…Ð°Ñ€Ð°Ð³Ð´Ð°Ð½Ð°.",
    startTour: "Ð¨Ð¸Ð½Ñ Ñ…ÑÑ€ÑÐ³Ð»ÑÐ³Ñ‡Ð´ÑÐ´ Ð·Ð¾Ñ€Ð¸ÑƒÐ»ÑÐ°Ð½ Ñ‚Ð°Ð½Ð¸Ð»Ñ†ÑƒÑƒÐ»Ð³Ð° ÑÑ…Ð»Ò¯Ò¯Ð»ÑÑ…",
    close: "ÐžÐ¹Ð»Ð³Ð¾Ð»Ð¾Ð¾"
  },


  onboard: {
    title: "Quick setup",
    subtitle: "Ð­Ñ…Ð»ÑÑ…ÑÑÑ Ó©Ð¼Ð½Ó© Ñ…ÑÐ´ÑÐ½ Ñ‚Ð¾Ñ…Ð¸Ñ€Ð³Ð¾Ð¾ ÑÐ¾Ð½Ð³Ð¾Ñ‘ :)",
    progress: "ÐÐ»Ñ…Ð°Ð¼ {current} / {total}",
    languageTitle: "Ð¥ÑÐ» ÑÐ¾Ð½Ð³Ð¾Ñ…",
    languageDesc: "Ð¦ÑÑ Ð±Ð¾Ð»Ð¾Ð½ Ð·Ó©Ð²Ð»Ó©Ð¼Ð¶Ð¸Ð¹Ð½ Ñ…ÑÐ»Ð¸Ð¹Ð³ ÑÐ¾Ð½Ð³Ð¾Ð½Ð¾ ÑƒÑƒ.",
    accentTitle: "Accent Ó©Ð½Ð³Ó© ÑÐ¾Ð½Ð³Ð¾Ñ…",
    accentDesc: "Ð¢Ð°Ð°Ð»Ð°Ð³Ð´ÑÐ°Ð½ Ó©Ð½Ð³Ó©Ó© ÑÐ¾Ð½Ð³Ð¾Ð½Ð¾ ÑƒÑƒ.",
    back: "Ð‘ÑƒÑ†Ð°Ñ…",
    next: "Ð”Ð°Ñ€Ð°Ð°Ñ…",
    continue: "Ò®Ñ€Ð³ÑÐ»Ð¶Ð»Ò¯Ò¯Ð»ÑÑ…",
    languages: {
      English: "ÐÐ½Ð³Ð»Ð¸",
      Mongolian: "ÐœÐ¾Ð½Ð³Ð¾Ð»",
      Japanese: "Japanese"
    },
    colors: {
      blue: "Ð¦ÑÐ½Ñ…ÑÑ€",
      green: "ÐÐ¾Ð³Ð¾Ð¾Ð½",
      purple: "ÐÐ¸Ð» ÑÐ³Ð°Ð°Ð½",
      orange: "Ð£Ð»Ð±Ð°Ñ€ ÑˆÐ°Ñ€",
      red: "Ð£Ð»Ð°Ð°Ð½",
      teal: "ÐÐ¾Ð³Ð¾Ð¾Ð½ Ñ†ÑÐ½Ñ…ÑÑ€"
    }
  },

  about: {
    description: "Ð¥Ó©Ð³Ð¶Ò¯Ò¯Ð»ÑÐ»Ñ‚ Ò¯Ñ€Ð³ÑÐ»Ð¶Ð¸Ð»Ð¶ Ð±Ð°Ð¹Ð½Ð°. Ð¢ÑƒÐ½ ÑƒÐ´Ð°Ñ…Ð³Ò¯Ð¹ Ð¸Ñ… Ð¸Ð»Ò¯Ò¯ Ð·Ò¯Ð¹Ð» Ð½ÑÐ¼ÑÐ³Ð´ÑÐ½Ñ.",
    authorLabel: "Ð—Ð¾Ñ…Ð¸Ð¾Ð³Ñ‡",
    checkUpdates: "Ð¨Ð¸Ð½ÑÑ‡Ð»ÑÐ» ÑˆÐ°Ð»Ð³Ð°Ñ…",
    ok: "Ð—Ð°",
    versionLabel: "Ð¥ÑƒÐ²Ð¸Ð»Ð±Ð°Ñ€"
  },
  tour: {
    title: "Ð¢Ð°Ð½Ð¸Ð»Ñ†ÑƒÑƒÐ»Ð³Ð°",
    back: "Ð‘ÑƒÑ†Ð°Ñ…",
    skip: "ÐÐ»Ð³Ð°ÑÐ°Ñ…",
    next: "Ð”Ð°Ñ€Ð°Ð°Ñ…",
    finish: "Ð”ÑƒÑƒÑÐ³Ð°Ñ…",
    steps: {
      menu: {
        title: "Ð¦ÑÑÐ½Ð¸Ð¹ Ð¼Ó©Ñ€",
        description: "File, Edit, View, More Ð±Ò¯Ð³Ð´ ÑÐ½Ð´ Ð±Ð°Ð¹Ð½Ð°."
      },
      tabs: {
        title: "Ð¢Ð°Ð±ÑƒÑƒÐ´",
        description: "Ð¢ÑÐ¼Ð´ÑÐ³Ð»ÑÐ» Ò¯Ò¯ÑÐ³ÑÐ¶, Ñ…Ð¾Ð¾Ñ€Ð¾Ð½Ð´ Ð½ÑŒ ÑˆÐ¸Ð»Ð¶Ð¸Ð½Ñ."
      },
      editor: {
        title: "Ð¢ÐµÐºÑÑ‚ Ð·Ð°ÑÐ²Ð°Ñ€Ð»Ð°Ð³Ñ‡",
        description: "Ð­Ð½Ð´ Ñ‚Ð° Ð±Ð¸Ñ‡Ð½Ñ."
      },
      formatting: {
        title: "Ð¤Ð¾Ñ€Ð¼Ð°Ñ‚Ð»Ð°Ñ…",
        description: "Ð“Ð°Ñ€Ñ‡Ð¸Ð³ Ð±Ð¾Ð»Ð¾Ð½ Ð¶Ð°Ð³ÑÐ°Ð°Ð»Ñ‚Ð°Ð´ Ñ…ÑƒÑ€Ð´Ð°Ð½ Ñ…ÑÑ€ÑÐ³ÑÑÐ»."
      },
      search: {
        title: "Ð¥Ð°Ð¹Ð»Ñ‚",
        description: "Ð¢ÑÐ¼Ð´ÑÐ³Ð»ÑÐ» Ð´Ð¾Ñ‚Ñ€Ð¾Ð¾Ñ Ñ‚ÐµÐºÑÑ‚ Ñ…Ð°Ð¹Ð½Ð°."
      },
      sidePanel: {
        title: "Ð¥Ð°Ð¶ÑƒÑƒ ÑÐ°Ð¼Ð±Ð°Ñ€",
        description: "Ð‘Ò¯Ñ‚ÑÑ†, ÑˆÐ¾ÑˆÐ³Ð¾, Ð¼ÑÐ´ÑÑÐ»ÑÐ» ÑÐ½Ð´ Ð±Ð°Ð¹Ð½Ð°."
      },
      settings: {
        title: "Ð¢Ð¾Ñ…Ð¸Ñ€Ð³Ð¾Ð¾",
        description: "LucidPad-Ð°Ð° Ó©Ó©Ñ€Ñ‚Ó©Ó© Ñ‚Ð°Ð°Ñ€ÑƒÑƒÐ»Ð¶ Ñ‚Ð¾Ñ…Ð¸Ñ€ÑƒÑƒÐ»Ð½Ð° ÑƒÑƒ."
      }
    }
  },
  activity: {
    empty: "ÐžÐ´Ð¾Ð¾Ð³Ð¾Ð¾Ñ€ ÑÐ¼Ð°Ñ€ Ð½ÑÐ³ÑÐ½ Ð¼ÑÐ´ÑÐ³Ð´ÑÐ» Ð°Ð»Ð³Ð°.",
    retry: "Ð”Ð°Ñ…Ð¸Ð½ Ð¾Ñ€Ð¾Ð»Ð´Ð¾Ñ…"
  },
  autosave: {
    inProgress: "ÐÐ²Ñ‚Ð¾ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ð»Ñ‚ ÑÑ…ÑÐ»Ð»ÑÑ",
    complete: "ÐÐ²Ñ‚Ð¾ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ð»Ñ‚ Ð´ÑƒÑƒÑÐ»Ð°Ð°"
  },
  save: {
    changesTitle: "Ó¨Ó©Ñ€Ñ‡Ð»Ó©Ð»Ñ‚ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ñ… ÑƒÑƒ?",
    changesMessage: "Ð­Ð½Ñ Ñ‚ÑÐ¼Ð´ÑÐ³Ð»ÑÐ» Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ð³Ð´Ð°Ð°Ð³Ò¯Ð¹ Ó©Ó©Ñ€Ñ‡Ð»Ó©Ð»Ñ‚Ñ‚ÑÐ¹ Ð±Ð°Ð¹Ð½Ð°.",
    changesCancel: "Ð¦ÑƒÑ†Ð»Ð°Ñ…",
    changesDontSave: "Ð¥Ð°Ð´Ð³Ð°Ð»Ð°Ñ…Ð³Ò¯Ð¹",
    changesSave: "Ð¥Ð°Ð´Ð³Ð°Ð»Ð°Ñ…",
    tabUnsaved: "Ð­Ð½Ñ Ñ‚Ð°Ð± Ð´ÑÑÑ€ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ð°Ð³Ò¯Ð¹ Ó©Ó©Ñ€Ñ‡Ð»Ó©Ð»Ñ‚ Ð±Ð°Ð¹Ð½Ð°.",
    overwriteMessage: "\"{name}\" Ñ„Ð°Ð¹Ð»Ð´ Ó©Ó©Ñ€Ñ‡Ð»Ó©Ð»Ñ‚ Ñ…Ð¸Ð¹ÑÑÐ½ Ð±Ð°Ð¹Ð½Ð°? Ð¢Ð° Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ñ…Ð´Ð°Ð° Ð¸Ñ‚Ð³ÑÐ»Ñ‚ÑÐ¹ Ð±Ð°Ð¹Ð½Ð° ÑƒÑƒ?",
    formatTitle: "Ð¥Ð°Ð´Ð³Ð°Ð»Ð°Ñ…",
    formatMessage: "Ð­Ð½Ñ Ñ‚ÑÐ¼Ð´ÑÐ³Ð»ÑÐ»Ð¸Ð¹Ð³ ÑÐ¼Ð°Ñ€ Ñ„Ð¾Ñ€Ð¼Ð°Ñ‚Ð°Ð°Ñ€ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ñ… Ð²Ñ?",
    formatHint: "Ð‘Ð¸Ñ‡Ð²ÑÑ€Ð¸Ð¹Ð½ Ñ„Ð¾Ñ€Ð¼Ð°Ñ‚ Ð¸Ð»ÑÑ€ÑÑÐ½. Markdown Ð½ÑŒ Ð³Ð°Ñ€Ñ‡Ð¸Ð³, Ð¶Ð°Ð³ÑÐ°Ð°Ð»Ñ‚, Ñ…Ð¾Ð»Ð±Ð¾Ð¾Ñ, Ð¾Ð½Ñ†Ð»Ð¾Ð»Ñ‹Ð³ Ñ…Ð°Ð´Ð³Ð°Ð»Ð½Ð°. Text Ð½ÑŒ Ñ„Ð¾Ñ€Ð¼Ð°Ñ‚Ñ‹Ð³ Ð°Ñ€Ð¸Ð»Ð³Ð°Ð½Ð°.",
    cancel: "Ð¦ÑƒÑ†Ð»Ð°Ñ…",
    text: "Ð¢ÐµÐºÑÑ‚ (.txt)",
    markdown: "Markdown (.md)"
  },
  toast: {
    downloadComplete: "Ð¢Ð°Ñ‚Ð°Ð»Ñ‚ Ð´ÑƒÑƒÑÐ»Ð°Ð°",
    openFile: "Ð¤Ð°Ð¹Ð» Ð½ÑÑÑ…",
    showInFolder: "Ð¥Ð°Ð²Ñ‚ÑÐ°Ð½Ð´ Ñ…Ð°Ñ€ÑƒÑƒÐ»Ð°Ñ…",
    undo: "Ð‘ÑƒÑ†Ð°Ð°Ñ…",
    tabClosed: "Ð¢Ð°Ð± Ñ…Ð°Ð°Ð³Ð´Ð»Ð°Ð°",
    settingsReset: "Ð¢Ð¾Ñ…Ð¸Ñ€Ð³Ð¾Ð¾ Ð°Ð½Ñ…Ð´Ð°Ð³Ñ‡ ÑƒÑ‚Ð³Ð° Ñ€ÑƒÑƒ ÑÑÑ€Ð³ÑÑÐ³Ð´Ð»ÑÑ.",
    checkingUpdates: "Ð¨Ð¸Ð½ÑÑ‡Ð»ÑÐ» ÑˆÐ°Ð»Ð³Ð°Ð¶ Ð±Ð°Ð¹Ð½Ð°...",
    changelogCopied: "Ó¨Ó©Ñ€Ñ‡Ð»Ó©Ð»Ñ‚Ð¸Ð¹Ð½ Ñ‚Ò¯Ò¯Ñ… Ñ…ÑƒÑƒÐ»Ð°Ð³Ð´Ð»Ð°Ð°.",
    tourTargetsMissing: "Ð¢Ð°Ð½Ð¸Ð»Ñ†ÑƒÑƒÐ»Ð³Ñ‹Ð½ Ð·Ð¾Ñ€Ð¸Ð»Ñ‚Ð¾Ñ‚ Ñ…ÑÑÑÐ³ Ð¾Ð»Ð´ÑÐ¾Ð½Ð³Ò¯Ð¹.",
    autosaveFailed: "ÐÐ²Ñ‚Ð¾ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ð»Ñ‚ Ð°Ð¼Ð¶Ð¸Ð»Ñ‚Ð³Ò¯Ð¹",
    downloadFailed: "Ð¢Ð°Ñ‚Ð°Ð»Ñ‚ Ð°Ð¼Ð¶Ð¸Ð»Ñ‚Ð³Ò¯Ð¹",
    updateReadyRestart: "Ð¨Ð¸Ð½ÑÑ‡Ð»ÑÐ» Ð±ÑÐ»ÑÐ½. Ð”Ð°Ñ…Ð¸Ð½ Ð°ÑÐ°Ð°Ð¶ Ð±Ð°Ð¹Ð½Ð°...",
    updateFailed: "Ð¨Ð¸Ð½ÑÑ‡Ð»ÑÐ»Ñ‚ Ð°Ð¼Ð¶Ð¸Ð»Ñ‚Ð³Ò¯Ð¹",
    restoreFailed: "Ð¡ÑÑ€Ð³ÑÑÑ…ÑÐ´ Ð°Ð»Ð´Ð°Ð° Ð³Ð°Ñ€Ð»Ð°Ð°",
    restoreFailedWithReason: "Ð¡ÑÑ€Ð³ÑÑÑ…ÑÐ´ Ð°Ð»Ð´Ð°Ð° Ð³Ð°Ñ€Ð»Ð°Ð°: {error}",
    backgroundVideoTemporary: "Ð’Ð¸Ð´ÐµÐ¾ Ð´ÑÐ²ÑÐ³ÑÑ€ Ñ‚Ò¯Ñ€ Ñ…ÑƒÐ³Ð°Ñ†Ð°Ð°Ð½Ð´ Ð¸Ð´ÑÐ²Ñ…Ñ‚ÑÐ¹ Ð±Ó©Ð³Ó©Ó©Ð´ Ð´Ð°Ñ…Ð¸Ð½ Ð°ÑÐ°Ð°Ñ…Ð°Ð´ reset Ñ…Ð¸Ð¹Ð³Ð´ÑÐ½Ñ."
  },
  footer: {
    autoSave: "ÐÐ²Ñ‚Ð¾ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ð»Ñ‚",
    on: "ÐÑÐ°Ð°Ð»Ñ‚Ñ‚Ð°Ð¹",
    off: "Ð£Ð½Ñ‚Ñ€Ð°Ð°Ð»Ñ‚Ñ‚Ð°Ð¹",
    session: "Session",
    line: "ÐœÓ©Ñ€",
    column: "Ð‘Ð°Ð³Ð°Ð½Ð°",
    chars: "Ñ‚ÑÐ¼Ð´ÑÐ³Ñ‚"
  }
}

  };

  function t(path) {
    const dict = i18n[currentLanguage] || i18n.English;
    const fromCurrent = path.split(".").reduce((acc, key) => (acc && acc[key] ? acc[key] : null), dict);
    if (fromCurrent) return fromCurrent;
    const fromEnglish = path.split(".").reduce((acc, key) => (acc && acc[key] ? acc[key] : null), i18n.English);
    return fromEnglish || path;
  }

  function setMenuButtonText(button, text) {
    if (!button) return;
    const textNode = Array.from(button.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode) {
      textNode.textContent = `${text} `;
    } else {
      button.insertBefore(document.createTextNode(`${text} `), button.firstChild);
    }
  }

  function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el) {
      el.textContent = text;
    }
  }

  function setTitle(selector, text) {
    const el = document.querySelector(selector);
    if (el) {
      el.setAttribute("title", text);
    }
  }

  function setAttr(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el) {
      el.setAttribute(attr, value);
    }
  }

  function syncOnboardLanguageOptions() {
    if (!onboardModal) return;
    onboardLangOptions.forEach((button) => {
      button.classList.toggle("active", button.dataset.onboardLanguage === currentLanguage);
    });
  }

  function syncOnboardAccentOptions() {
    if (!onboardModal) return;
    const activeAccent = localStorage.getItem("lp:accentColor") || "blue";
    onboardAccentOptions.forEach((button) => {
      button.classList.toggle("active", button.dataset.onboardAccent === activeAccent);
    });
  }

  function updateOnboardProgress() {
    if (!onboardModal) return;
    const total = 2;
    const current = onboardStep === "language" ? 1 : 2;
    const label = t("onboard.progress")
      .replace("{current}", String(current))
      .replace("{total}", String(total));
    onboardModal.querySelectorAll("[data-onboard-progress]").forEach((el) => {
      el.textContent = label;
    });
  }

  function setOnboardStep(step) {
    onboardStep = step;
    onboardSteps.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.onboardStep === step);
    });
    const backBtn = onboardModal?.querySelector('[data-onboard-action="back"]');
    const nextBtn = onboardModal?.querySelector('[data-onboard-action="next"]');
    if (backBtn) {
      backBtn.style.display = step === "language" ? "none" : "inline-flex";
      backBtn.textContent = t("onboard.back");
    }
    if (nextBtn) {
      nextBtn.textContent = step === "language" ? t("onboard.next") : t("onboard.continue");
    }
    updateOnboardProgress();
  }

  function normalizeLanguage(lang) {
    if (typeof lang !== "string") return "English";
    return SUPPORTED_LANGUAGES.includes(lang) ? lang : "English";
  }

  function applyLanguage(lang) {
    currentLanguage = normalizeLanguage(lang);
    localStorage.setItem("lp:language", currentLanguage);
    document.documentElement.lang = LANGUAGE_HTML_LANG[currentLanguage] || "en";

    renderToolbar();
    updateToolbarStates();
    updateToolbarVisibility();
    const blockLabel = toolbarBlockTrigger?.querySelector(".toolbar-trigger-label");
    if (blockLabel) blockLabel.textContent = "Block";
    const alignLabel = toolbarAlignTrigger?.querySelector(".toolbar-trigger-label");
    if (alignLabel) alignLabel.textContent = "Align";

    setText('.menu-item[data-menu="file"] .menu-label', t("menu.file"));
    setText('.menu-item[data-menu="edit"] .menu-label', t("menu.edit"));
    setText('.menu-item[data-menu="view"] .menu-label', t("menu.view"));
    setText('.menu-item[data-menu="help"] .menu-label', t("menu.more"));

    setMenuButtonText(document.querySelector('.menu-item[data-menu="file"] [data-action="file:new"]'), t("menuItem.newFile"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="file"] [data-action="file:open"]'), t("menuItem.open"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="file"] [data-action="file:save"]'), t("menuItem.save"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="file"] [data-action="file:saveAs"]'), t("menuItem.saveAs"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="file"] [data-action="file:trash"]'), t("menuItem.trash"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="file"] [data-action="file:closeTab"]'), t("menuItem.closeTab"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="file"] [data-action="app:quit"]'), t("menuItem.quit"));

    setMenuButtonText(document.querySelector('.menu-item[data-menu="edit"] [data-action="edit:undo"]'), t("menuItem.undo"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="edit"] [data-action="edit:redo"]'), t("menuItem.redo"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="edit"] [data-action="edit:cut"]'), t("menuItem.cut"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="edit"] [data-action="edit:copy"]'), t("menuItem.copy"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="edit"] [data-action="edit:paste"]'), t("menuItem.paste"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="edit"] [data-action="edit:selectAll"]'), t("menuItem.selectAll"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="edit"] [data-action="edit:find"]'), t("menuItem.find"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="edit"] [data-action="edit:replace"]'), t("menuItem.replace"));

    setMenuButtonText(document.querySelector('.menu-item[data-menu="view"] [data-action="view:wordWrap"]'), t("menuItem.wordWrap"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="view"] [data-action="view:zoomIn"]'), t("menuItem.zoomIn"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="view"] [data-action="view:zoomOut"]'), t("menuItem.zoomOut"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="view"] [data-action="view:zoomReset"]'), t("menuItem.zoomReset"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="view"] [data-action="view:fullscreen"]'), t("menuItem.fullscreen"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="view"] [data-action="view:zen"]'), t("menuItem.viewMode"));

    setMenuButtonText(document.querySelector('.menu-item[data-menu="help"] [data-action="help:about"]'), t("menuItem.about"));
    setMenuButtonText(document.querySelector('.menu-item[data-menu="help"] [data-action="help:changelog"]'), t("menuItem.changelog"));

    setTitle('[data-action="search"]', t("header.search"));
    setTitle('[data-action="preview-toggle"]', t("header.sidePanel"));
    setTitle('[data-action="zen-toggle"]', t("header.viewMode"));
    setTitle('[data-action="settings-open"]', t("header.settings"));
    setTitle('.tabs-container .icon-btn[title="New Tab"]', t("header.newTab"));
    setAttr(".floating-toolbar .font-selector", "data-tooltip", t("toolbar.headings"));
    setAttr(".floating-toolbar .list-selector", "data-tooltip", t("toolbar.lists"));
    setAttr('.floating-toolbar [data-action="bold"]', "data-tooltip", t("toolbar.bold"));
    setAttr('.floating-toolbar [data-action="italic"]', "data-tooltip", t("toolbar.italic"));
    setAttr('.floating-toolbar [data-action="underline"]', "data-tooltip", t("toolbar.underline"));
    setAttr('.floating-toolbar [data-action="strike"]', "data-tooltip", t("toolbar.strike"));
    setAttr('.floating-toolbar [data-action="code"]', "data-tooltip", t("toolbar.code"));
    setAttr('.floating-toolbar [data-action="highlight"]', "data-tooltip", t("toolbar.highlight"));
    setAttr('.floating-toolbar [data-action="align-left"]', "data-tooltip", t("toolbar.alignLeft"));
    setAttr('.floating-toolbar [data-action="align-center"]', "data-tooltip", t("toolbar.alignCenter"));
    setAttr('.floating-toolbar [data-action="align-right"]', "data-tooltip", t("toolbar.alignRight"));
    setAttr('.floating-toolbar [data-action="blockquote"]', "data-tooltip", t("toolbar.blockquote"));
    setAttr('.floating-toolbar [data-action="horizontal-rule"]', "data-tooltip", t("toolbar.horizontalRule"));
    setAttr('.floating-toolbar [data-action="table"]', "data-tooltip", t("toolbar.table"));
    setAttr('.floating-toolbar [data-action="table:add-row"]', "data-tooltip", t("toolbar.addRow"));
    setAttr('.floating-toolbar [data-action="table:add-col"]', "data-tooltip", t("toolbar.addColumn"));
    setAttr('.floating-toolbar [data-action="table:delete"]', "data-tooltip", t("toolbar.deleteTable"));
    setAttr('.floating-toolbar [data-action="subscript"]', "data-tooltip", t("toolbar.subscript"));
    setAttr('.floating-toolbar [data-action="superscript"]', "data-tooltip", t("toolbar.superscript"));
    setAttr('.floating-toolbar [data-action="text-color"]', "data-tooltip", t("toolbar.textColor"));
    setAttr('.floating-toolbar [data-action="highlight-color"]', "data-tooltip", t("toolbar.highlightColor"));
    setAttr('.floating-toolbar [data-action="undo"]', "data-tooltip", t("toolbar.undo"));
    setAttr('.floating-toolbar [data-action="redo"]', "data-tooltip", t("toolbar.redo"));
    setAttr('.floating-toolbar [data-action="clear"]', "data-tooltip", t("toolbar.clearFormatting"));
    setAttr('.floating-toolbar [data-action="word-wrap"]', "data-tooltip", t("toolbar.wordWrap"));
    setTitle('.floating-toolbar [data-action="bold"]', `${t("toolbar.bold")} (Ctrl+B)`);
    setTitle('.floating-toolbar [data-action="italic"]', `${t("toolbar.italic")} (Ctrl+I)`);
    setTitle('.floating-toolbar [data-action="underline"]', `${t("toolbar.underline")} (Ctrl+U)`);
    setTitle('.floating-toolbar [data-action="strike"]', t("toolbar.strike"));
    setTitle('.floating-toolbar [data-action="code"]', t("toolbar.code"));
    setTitle('.floating-toolbar [data-action="highlight"]', t("toolbar.highlight"));
    setTitle('.floating-toolbar [data-action="align-left"]', t("toolbar.alignLeft"));
    setTitle('.floating-toolbar [data-action="align-center"]', t("toolbar.alignCenter"));
    setTitle('.floating-toolbar [data-action="align-right"]', t("toolbar.alignRight"));
    setTitle('.floating-toolbar [data-action="blockquote"]', t("toolbar.blockquote"));
    setTitle('.floating-toolbar [data-action="horizontal-rule"]', t("toolbar.horizontalRule"));
    setTitle('.floating-toolbar [data-action="table"]', t("toolbar.table"));
    setTitle('.floating-toolbar [data-action="table:add-row"]', t("toolbar.addRow"));
    setTitle('.floating-toolbar [data-action="table:add-col"]', t("toolbar.addColumn"));
    setTitle('.floating-toolbar [data-action="table:delete"]', t("toolbar.deleteTable"));
    setTitle('.floating-toolbar [data-action="subscript"]', t("toolbar.subscript"));
    setTitle('.floating-toolbar [data-action="superscript"]', t("toolbar.superscript"));
    setTitle('.floating-toolbar [data-action="text-color"]', t("toolbar.textColor"));
    setTitle('.floating-toolbar [data-action="highlight-color"]', t("toolbar.highlightColor"));
    setTitle('.floating-toolbar [data-action="undo"]', `${t("toolbar.undo")} (Ctrl+Z)`);
    setTitle('.floating-toolbar [data-action="redo"]', `${t("toolbar.redo")} (Ctrl+Y)`);
    setTitle('.floating-toolbar [data-action="clear"]', t("toolbar.clearFormatting"));
    setTitle('.floating-toolbar [data-action="word-wrap"]', t("toolbar.wordWrap"));
    setText(".outline-title", t("panel.sideTitle"));
    setText(".outline-section:nth-of-type(1) h4", t("panel.outline"));
    setText(".outline-section:nth-of-type(2) h4", t("panel.backlinks"));
    setText(".outline-section:nth-of-type(3) h4", t("panel.tags"));
    setText(".outline-section:nth-of-type(4) h4", t("panel.noteInfo"));
    setText(".viewmode-exit .viewmode-exit-label", t("viewMode.exit"));
    setAttr(".viewmode-exit", "aria-label", t("viewMode.exit"));
    setText("[data-trash-title]", t("trash.title"));
    setText("[data-trash-footer]", t("trash.footer"));
    setText('[data-trash-action="clear"]', t("trash.clear"));
    setTitle('.trash-back[data-trash-action="close"]', t("trash.close"));
    renderTrash();
    setText('#heading-popover [data-action="format:title"]', t("toolbar.title"));
    setText('#heading-popover [data-action="format:subtitle"]', t("toolbar.subtitle"));
    setText('#heading-popover [data-action="format:heading"]', t("toolbar.heading"));
    setText('#heading-popover [data-action="format:subheading"]', t("toolbar.subheading"));
    setText('#heading-popover [data-action="format:section"]', t("toolbar.section"));
    setText('#heading-popover [data-action="format:subsection"]', t("toolbar.subsection"));
    setText('#heading-popover [data-action="format:body"]', t("toolbar.body"));
    setText('#list-popover [data-action="list:bullet"]', t("toolbar.bulletList"));
    setText('#list-popover [data-action="list:number"]', t("toolbar.numberedList"));
    setText("#format-modal .save-title", t("save.formatTitle"));
    setText("#format-modal .save-message:not(.subtle)", t("save.formatMessage"));
    setText("#format-modal .save-message.subtle", t("save.formatHint"));
    setText('#format-modal [data-format-action="cancel"]', t("save.cancel"));
    setText('#format-modal [data-format-action="txt"]', t("save.text"));
    setText('#format-modal [data-format-action="md"]', t("save.markdown"));
    setText("#save-modal .save-title", t("save.changesTitle"));
    setText("#save-modal [data-save-message]", t("save.changesMessage"));
    setText('#save-modal [data-save-action="cancel"]', t("save.changesCancel"));
    setText('#save-modal [data-save-action="dont-save"]', t("save.changesDontSave"));
    setText('#save-modal [data-save-action="save"]', t("save.changesSave"));

    const settingsTitle = settingsPage?.querySelector(".settings-title-text");
    if (settingsTitle) settingsTitle.textContent = t("settings.title");
    const sections = settingsPage?.querySelectorAll(".settings-section h3") || [];
    const sectionKeys = ["settings.general", "settings.editor", "settings.appearance", "settings.files", "settings.notifications", "settings.reset"];
    sections.forEach((section, index) => {
      if (sectionKeys[index]) section.textContent = t(sectionKeys[index]);
    });
    const settingsFooter = settingsPage?.querySelector(".settings-page-footer");
    if (settingsFooter) settingsFooter.textContent = t("settings.footer");

    const setSettingText = (settingKey, labelKey, hintKey) => {
      const input = settingsPage?.querySelector(`[data-setting="${settingKey}"]`);
      const item = input?.closest(".settings-item");
      if (!item) return;
      const label = item.querySelector("label");
      const hint = item.querySelector(".settings-hint");
      if (label) label.textContent = t(labelKey);
      if (hint) hint.textContent = t(hintKey);
    };
    setSettingText("auto-update", "settings.autoUpdate", "settings.autoUpdateHint");
    setSettingText("startup", "settings.startup", "settings.startupHint");
    setSettingText("plain-mode", "settings.plainMode", "settings.plainModeHint");
    setSettingText("autosave", "settings.autosave", "settings.autosaveHint");
    setSettingText("autosave-interval", "settings.autosaveInterval", "settings.autosaveIntervalHint");
    setSettingText("spellcheck", "settings.spellcheck", "settings.spellcheckHint");
    setSettingText("font-size", "settings.fontSize", "settings.fontSizeHint");
    setSettingText("wordwrap", "settings.wordWrap", "settings.wordWrapHint");
    setSettingText("line-highlight", "settings.lineHighlight", "settings.lineHighlightHint");
    setSettingText("background-image-pick", "settings.backgroundImage", "settings.backgroundImageHint");
    setSettingText("background-image-preview", "settings.backgroundPreview", "settings.backgroundPreviewHint");
    setSettingText("background-image-dim", "settings.backgroundDim", "settings.backgroundDimHint");
    setSettingText("background-image-blur", "settings.backgroundBlur", "settings.backgroundBlurHint");
    setSettingText("adaptive-vibe", "settings.adaptiveVibe", "settings.adaptiveVibeHint");
    setSettingText("adaptive-accent-suggest", "settings.adaptiveAccent", "settings.adaptiveAccentHint");
    setSettingText("blur-effects", "settings.blurEffects", "settings.blurEffectsHint");
    setSettingText("reduce-motion", "settings.reduceMotion", "settings.reduceMotionHint");
    setSettingText("confirm-overwrite", "settings.confirmOverwrite", "settings.confirmOverwriteHint");
    setSettingText("export-folder", "settings.exportFolder", "settings.exportFolderHint");
    setSettingText("update-notifications", "settings.updateNotifications", "settings.updateNotificationsHint");
    setSettingText("error-toasts", "settings.errorToasts", "settings.errorToastsHint");

    const languageItem = settingsPage?.querySelector('.settings-dropdown[data-setting="language"]')?.closest(".settings-item");
    if (languageItem) {
      const label = languageItem.querySelector("label");
      const hint = languageItem.querySelector(".settings-hint");
      if (label) label.textContent = t("settings.language");
      if (hint) hint.textContent = t("settings.languageHint");
    }
    const welcomeItem = settingsPage?.querySelector('[data-setting="welcome-tour"]')?.closest(".settings-item");
    if (welcomeItem) {
      const label = welcomeItem.querySelector("label");
      const hint = welcomeItem.querySelector(".settings-hint");
      if (label) label.textContent = t("settings.welcomeTips");
      if (hint) hint.textContent = t("settings.welcomeTipsHint");
      const btn = welcomeItem.querySelector("button");
      if (btn) btn.textContent = t("settings.startTour");
    }
    const accentItem = settingsPage?.querySelector(".settings-chip")?.closest(".settings-item");
    if (accentItem) {
      const label = accentItem.querySelector("label");
      const hint = accentItem.querySelector(".settings-hint");
      if (label) label.textContent = t("settings.accent");
      if (hint) hint.textContent = t("settings.accentHint");
    }
    const backgroundImageItem = settingsPage?.querySelector('[data-setting="background-image-pick"]')?.closest(".settings-item");
    if (backgroundImageItem) {
      const pickBtn = backgroundImageItem.querySelector('[data-setting="background-image-pick"]');
      const exampleBtn = backgroundImageItem.querySelector('[data-setting="background-image-example"]');
      const clearBtn = backgroundImageItem.querySelector('[data-setting="background-image-clear"]');
      if (pickBtn) pickBtn.textContent = t("settings.backgroundChoose");
      if (exampleBtn) exampleBtn.textContent = t("settings.backgroundExample");
      if (clearBtn) clearBtn.textContent = t("settings.backgroundClear");
    }
    const adaptiveAccentItem = settingsPage?.querySelector('[data-setting="adaptive-accent-suggest"]')?.closest(".settings-item");
    if (adaptiveAccentItem) {
      const applyBtn = adaptiveAccentItem.querySelector('[data-setting="adaptive-accent-suggest"]');
      if (applyBtn) applyBtn.textContent = t("settings.adaptiveAccentUse");
    }
    const resetItem = settingsResetButton?.closest(".settings-item");
    if (resetItem) {
      const label = resetItem.querySelector("label");
      const hint = resetItem.querySelector(".settings-hint");
      if (label) label.textContent = t("settings.resetLabel");
      if (hint) hint.textContent = t("settings.resetHint");
      if (settingsResetButton) settingsResetButton.textContent = t("settings.resetButton");
    }

    const langDropdown = settingsPage?.querySelector('.settings-dropdown[data-setting="language"]');
    if (langDropdown) {
      const trigger = langDropdown.querySelector(".dropdown-trigger span");
      const items = Array.from(langDropdown.querySelectorAll(".dropdown-item"));
      items.forEach((item) => {
        const value = item.dataset.value;
        if (value && LANGUAGE_LABELS[value]) item.textContent = LANGUAGE_LABELS[value];
        item.classList.toggle("active", value === currentLanguage);
      });
      if (trigger) {
        trigger.textContent = LANGUAGE_LABELS[currentLanguage] || "English";
      }
      langDropdown.dataset.value = currentLanguage;
    }

    if (findInput) {
      findInput.setAttribute("placeholder", t("find.placeholder"));
    }

    if (welcomeModal) {
      const title = welcomeModal.querySelector(".welcome-title");
      const text = welcomeModal.querySelector(".welcome-text");
      const tips = welcomeModal.querySelectorAll(".welcome-list li");
      const tourBtn = welcomeModal.querySelector('[data-welcome-action="tour"]');
      const closeBtn = welcomeModal.querySelector('[data-welcome-action="close"]');
      if (title) title.textContent = t("welcome.title");
      if (text) text.textContent = t("welcome.text");
      if (tips[0]) tips[0].textContent = t("welcome.tip1");
      if (tips[1]) tips[1].textContent = t("welcome.tip2");
      if (tips[2]) tips[2].textContent = t("welcome.tip3");
      if (tourBtn) tourBtn.textContent = t("welcome.startTour");
      if (closeBtn) closeBtn.textContent = t("welcome.close");
    }
    if (onboardModal) {
      const title = onboardModal.querySelector("[data-onboard-title]");
      const subtitle = onboardModal.querySelector("[data-onboard-subtitle]");
      const langTitle = onboardModal.querySelector("[data-onboard-language-title]");
      const langDesc = onboardModal.querySelector("[data-onboard-language-desc]");
      const accentTitle = onboardModal.querySelector("[data-onboard-accent-title]");
      const accentDesc = onboardModal.querySelector("[data-onboard-accent-desc]");
      if (title) title.textContent = t("onboard.title");
      if (subtitle) subtitle.textContent = t("onboard.subtitle");
      if (langTitle) langTitle.textContent = t("onboard.languageTitle");
      if (langDesc) langDesc.textContent = t("onboard.languageDesc");
      if (accentTitle) accentTitle.textContent = t("onboard.accentTitle");
      if (accentDesc) accentDesc.textContent = t("onboard.accentDesc");
      onboardModal.querySelectorAll("[data-onboard-language-label]").forEach((el) => {
        const key = el.dataset.onboardLanguageLabel;
        if (key) {
          el.textContent = t(`onboard.languages.${key}`);
        }
      });
      onboardModal.querySelectorAll("[data-onboard-accent-label]").forEach((el) => {
        const key = el.dataset.onboardAccentLabel;
        if (key) {
          el.textContent = t(`onboard.colors.${key}`);
        }
      });
      setOnboardStep(onboardStep);
      syncOnboardLanguageOptions();
      syncOnboardAccentOptions();
    }

    if (aboutModal) {
      const description = aboutModal.querySelector(".about-description");
      const updatesBtn = aboutModal.querySelector('[data-action="about-updates"]');
      const okBtn = aboutModal.querySelector('[data-action="about-close"]');
      if (description) description.textContent = t("about.description");
      if (updatesBtn) updatesBtn.textContent = t("about.checkUpdates");
      if (okBtn) okBtn.textContent = t("about.ok");
    }

    updateBackgroundControlState();
    updateFooterToggles();
    updateSessionTime();
    updateStatus();
    renderActivityList();
  }

  function resetAllSettings() {
    const keys = [
      "lp:autoSave",
      "lp:autoSaveInterval",
      "lp:spellcheck",
      "lp:markdownMode",
      "lp:plainMode",
      "lp:fontSize",
      "lp:lineHighlight",
      "lp:reduceMotion",
      "lp:blurEffects",
      "lp:confirmOverwrite",
      "lp:updateNotifications",
      "lp:errorToasts",
      "lp:wordWrap",
      "lp:accentColor",
      "lp:sidePanelOpen",
      "lp:sidePanelWidth",
      "lp:exportFolder",
      "lp:editorZoom",
      "lp:autoUpdate",
      "lp:bgImageData",
      "lp:bgMediaType",
      "lp:bgVideoPath",
      "lp:bgImageDim",
      "lp:bgImageBlur",
      "lp:adaptiveVibe",
      "lp:adaptiveSuggestedAccent"
    ];
    keys.forEach((key) => localStorage.removeItem(key));

    markdownMode = true;
    localStorage.setItem("lp:markdownMode", "1");
    setPlainMode(false);
    setAutosave(true);
    setAutosaveInterval(5000);
    setSpellcheck(false);
    setWordWrap(true);
    isLineHighlightEnabled = false;
    localStorage.setItem("lp:lineHighlight", "0");
    scheduleLineHighlight();
    confirmOverwriteEnabled = true;
    localStorage.setItem("lp:confirmOverwrite", "1");
    updateNotificationsEnabled = true;
    localStorage.setItem("lp:updateNotifications", "1");
    errorToastsEnabled = true;
    localStorage.setItem("lp:errorToasts", "1");
    document.body.classList.remove("reduce-motion");
    localStorage.setItem("lp:reduceMotion", "0");
    document.body.classList.remove("no-blur");
    localStorage.setItem("lp:blurEffects", "1");
    setAdaptiveVibeEnabled(false);
    releaseBackgroundVideoObjectUrl();
    backgroundImageData = "";
    backgroundMediaType = "";
    backgroundVideoSource = "";
    backgroundVideoPath = "";
    backgroundImageDim = 55;
    backgroundImageBlur = 0;
    applyBackgroundImage();
    persistBackgroundImageSettings();
    setAccentColor("blue");
    setSidePanelOpen(false);
    setFontSizePreset("Default");
    editorZoom = 1;
    localStorage.setItem("lp:editorZoom", "1");
    captureEditorBaseMetrics();
    applyEditorZoom();
    if (settingsExportFolderInput) {
      settingsExportFolderInput.value = "";
    }
    localStorage.removeItem("lp:exportFolder");

    if (settingsAutoSaveToggle) {
      settingsAutoSaveToggle.checked = autosaveEnabled;
      settingsAutoSaveToggle.setAttribute("aria-checked", autosaveEnabled ? "true" : "false");
    }
    if (settingsWordWrapToggle) {
      settingsWordWrapToggle.checked = isWrap;
      settingsWordWrapToggle.setAttribute("aria-checked", isWrap ? "true" : "false");
    }
    if (settingsSpellcheckToggle) {
      settingsSpellcheckToggle.checked = false;
      settingsSpellcheckToggle.setAttribute("aria-checked", "false");
    }
    if (settingsPlainModeToggle) {
      settingsPlainModeToggle.checked = false;
      settingsPlainModeToggle.setAttribute("aria-checked", "false");
    }
    if (settingsLineHighlightToggle) {
      settingsLineHighlightToggle.checked = false;
      settingsLineHighlightToggle.setAttribute("aria-checked", "false");
    }
    if (settingsBlurToggle) {
      settingsBlurToggle.checked = true;
      settingsBlurToggle.setAttribute("aria-checked", "true");
    }
    if (settingsReduceMotionToggle) {
      settingsReduceMotionToggle.checked = false;
      settingsReduceMotionToggle.setAttribute("aria-checked", "false");
    }
    if (settingsConfirmOverwriteToggle) {
      settingsConfirmOverwriteToggle.checked = true;
      settingsConfirmOverwriteToggle.setAttribute("aria-checked", "true");
    }
    if (settingsUpdateNotificationsToggle) {
      settingsUpdateNotificationsToggle.checked = true;
      settingsUpdateNotificationsToggle.setAttribute("aria-checked", "true");
    }
    if (settingsErrorToastsToggle) {
      settingsErrorToastsToggle.checked = true;
      settingsErrorToastsToggle.setAttribute("aria-checked", "true");
    }
    if (settingsAutoUpdateToggle) {
      settingsAutoUpdateToggle.checked = true;
      settingsAutoUpdateToggle.setAttribute("aria-checked", "true");
    }
    if (settingsStartupToggle && api) {
      settingsStartupToggle.checked = false;
      settingsStartupToggle.setAttribute("aria-checked", "false");
      api.action("app:startup:set", { enabled: false });
    }
    syncAutosaveIntervalDropdown();
    syncFontSizeDropdown();
    updateFooterToggles();
    updatePreview();
  }

  function showNotification(message, options = {}) {
    const toast = document.createElement("div");
    toast.className = "lp-toast";
    if (options.variant) {
      toast.classList.add(options.variant);
    }
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
      removeWithTransition(toast);
    }, duration);
  }

  function showErrorToast(message) {
    if (!errorToastsEnabled) return;
    showNotification(message, { variant: "error" });
  }

  function showUndoToast(message, onUndo) {
    const toast = document.createElement("div");
    toast.className = "lp-toast";
    const duration = 2800;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-action">${t("toast.undo")}</button>
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
      removeWithTransition(toast);
    };
    undoBtn?.addEventListener("click", () => {
      onUndo?.();
      cleanup();
    });
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(cleanup, duration);
  }

  activityBell?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleActivityPanel();
  });

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

  function openSettingsModal() {
    if (!settingsModal) return;
    settingsModal.classList.add("open");
    settingsModal.setAttribute("aria-hidden", "false");
    syncSettingsUI();
  }

  function closeSettingsModal() {
    if (!settingsModal) return;
    settingsModal.classList.remove("open");
    settingsModal.setAttribute("aria-hidden", "true");
  }

  function openSettingsPage() {
    if (!settingsPage) return;
    closeTrashModal();
    closeMenus();
    settingsPage.classList.remove("closing");
    settingsPage.classList.add("open");
    settingsPage.setAttribute("aria-hidden", "false");
  }

  function closeSettingsPage() {
    if (!settingsPage) return;
    if (!settingsPage.classList.contains("open")) return;
    if (document.body.classList.contains("reduce-motion")) {
      settingsPage.classList.remove("open", "closing");
      settingsPage.setAttribute("aria-hidden", "true");
      return;
    }
    settingsPage.classList.add("closing");
    const handleClose = (event) => {
      if (event.target !== settingsPage) return;
      settingsPage.classList.remove("open", "closing");
      settingsPage.setAttribute("aria-hidden", "true");
      settingsPage.removeEventListener("transitionend", handleClose);
    };
    settingsPage.addEventListener("transitionend", handleClose);
  }

  function closeSettingsDropdowns(except) {
    if (!settingsDropdowns.length) return;
    settingsDropdowns.forEach((dropdown) => {
      if (dropdown !== except) {
        dropdown.classList.remove("open");
      }
    });
  }

  function closeSpellMenu() {
    if (!spellMenu) return;
    spellMenu.classList.remove("open");
    spellMenu.setAttribute("aria-hidden", "true");
    document.body.classList.remove("spell-menu-open");
  }

  function openSpellMenu(payload) {
    if (!spellMenu || !spellItems || !payload) return;
    const { word, suggestions = [], x = 0, y = 0 } = payload;
    document.body.classList.add("spell-menu-open");
    spellItems.innerHTML = "";
    if (!suggestions.length) {
      const emptyBtn = document.createElement("button");
      emptyBtn.className = "spell-item disabled";
      emptyBtn.type = "button";
      emptyBtn.textContent = "No suggestions";
      spellItems.appendChild(emptyBtn);
    } else {
      suggestions.slice(0, 6).forEach((suggestion) => {
        const btn = document.createElement("button");
        btn.className = "spell-item";
        btn.type = "button";
        btn.textContent = suggestion;
        btn.dataset.action = "replace";
        btn.dataset.value = suggestion;
        spellItems.appendChild(btn);
      });
    }
    const divider = document.createElement("div");
    divider.className = "spell-divider";
    spellItems.appendChild(divider);
    const addBtn = document.createElement("button");
    addBtn.className = "spell-item";
    addBtn.type = "button";
    addBtn.textContent = "Add to dictionary";
    addBtn.dataset.action = "add";
    addBtn.dataset.value = word || "";
    spellItems.appendChild(addBtn);

    spellMenu.style.left = `${x}px`;
    spellMenu.style.top = `${y}px`;
    spellMenu.classList.add("open");
    spellMenu.setAttribute("aria-hidden", "false");

    const rect = spellMenu.getBoundingClientRect();
    const padding = 12;
    let nextLeft = x;
    let nextTop = y;
    if (rect.right > window.innerWidth - padding) {
      nextLeft = Math.max(padding, window.innerWidth - rect.width - padding);
    }
    if (rect.bottom > window.innerHeight - padding) {
      nextTop = Math.max(padding, window.innerHeight - rect.height - padding);
    }
    spellMenu.style.left = `${nextLeft}px`;
    spellMenu.style.top = `${nextTop}px`;
  }

  function syncAutosaveIntervalDropdown() {
    if (!settingsDropdowns.length) return;
    const dropdown = settingsDropdowns.find((item) => item.dataset.setting === "autosave-interval");
    if (!dropdown) return;
    const trigger = dropdown.querySelector(".dropdown-trigger span");
    const items = Array.from(dropdown.querySelectorAll(".dropdown-item"));
    const value = getAutosaveIntervalLabel(autosaveIntervalMs);
    dropdown.dataset.value = value;
    items.forEach((item) => {
      const isActive = item.dataset.value === value;
      item.classList.toggle("active", isActive);
      if (isActive && trigger) {
        trigger.textContent = item.textContent.trim();
      }
    });
  }

  function syncFontSizeDropdown() {
    if (!settingsDropdowns.length) return;
    const dropdown = settingsDropdowns.find((item) => item.dataset.setting === "font-size");
    if (!dropdown) return;
    const trigger = dropdown.querySelector(".dropdown-trigger span");
    const items = Array.from(dropdown.querySelectorAll(".dropdown-item"));
    const value = localStorage.getItem("lp:fontSize") || "Default";
    dropdown.dataset.value = value;
    items.forEach((item) => {
      const isActive = item.dataset.value === value;
      item.classList.toggle("active", isActive);
      if (isActive && trigger) {
        trigger.textContent = item.textContent.trim();
      }
    });
  }

  async function openAboutModal() {
    if (!aboutModal) return;
    aboutModal.classList.add("open");
    aboutModal.setAttribute("aria-hidden", "false");
    aboutAuthor.textContent = `${t("about.authorLabel")}: Moroodol`;
    if (api) {
      const result = await api.action("app:version");
      if (result?.version) {
        aboutVersion.textContent = `${t("about.versionLabel")} ${result.version}`;
      }
    }
  }

  function closeAboutModal() {
    if (!aboutModal) return;
    aboutModal.classList.remove("open");
    aboutModal.setAttribute("aria-hidden", "true");
  }

  function setDownloadStage(stage) {
    downloadStage = stage;
    downloadSteps.forEach((step) => {
      const value = step.dataset.downloadStep;
      step.classList.toggle("active", value === stage);
      const isCompleted = value !== stage && isStageCompleted(value, stage);
      step.classList.toggle("completed", isCompleted);
      const icon = step.querySelector("[data-step-icon]");
      if (icon) {
        const defaultIcon = icon.dataset.stepDefault || "check";
        setLucideIcon(icon, isCompleted ? "check" : defaultIcon);
      }
    });
    updateDownloadButtons();
  }

  function isStageCompleted(step, current) {
    const order = ["downloading", "verifying", "ready"];
    return order.indexOf(step) < order.indexOf(current);
  }

  function getFileExtension(name) {
    const parts = name.split(".");
    if (parts.length <= 1) return "";
    return parts[parts.length - 1].toLowerCase();
  }

  function getFileBadge(ext) {
    if (!ext) return "FILE";
    return ext.toUpperCase();
  }

  function getFileIconName(ext) {
    if (["zip", "rar", "7z"].includes(ext)) return "archive";
    if (["pdf"].includes(ext)) return "file-type-2";
    if (["exe", "msi"].includes(ext)) return "cpu";
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
    if (["mp4", "mov", "mkv"].includes(ext)) return "video";
    if (["mp3", "wav", "flac"].includes(ext)) return "music";
    if (["html", "htm"].includes(ext)) return "code";
    if (["txt", "md"].includes(ext)) return "file-text";
    return "file";
  }

  function showDownloadToast(filePath) {
    const toast = document.createElement("div");
    toast.className = "lp-toast show";
    toast.innerHTML = `
      <span class="toast-message">${t("toast.downloadComplete")}</span>
      <button class="toast-action" data-toast-action="open">${t("toast.openFile")}</button>
      <button class="toast-action" data-toast-action="folder">${t("toast.showInFolder")}</button>
      <span class="toast-progress"></span>
    `;
    document.body.appendChild(toast);
    const progress = toast.querySelector(".toast-progress");
    if (progress) {
      progress.style.animationDuration = "3200ms";
    }
    toast.addEventListener("click", async (event) => {
      const action = event.target.dataset.toastAction;
      if (!action || !api || !filePath) return;
      if (action === "open") {
        await api.action("download:openFile", { filePath });
      }
      if (action === "folder") {
        await api.action("download:openFolder", { filePath });
      }
      toast.classList.remove("show");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    });
    setTimeout(() => {
      toast.classList.remove("show");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }, 3200);
  }

  function openChangelogModal() {
    if (!changelogModal) return;
    changelogModal.classList.add("open");
    changelogModal.setAttribute("aria-hidden", "false");
  }

  function closeChangelogModal() {
    if (!changelogModal) return;
    changelogModal.classList.remove("open");
    changelogModal.setAttribute("aria-hidden", "true");
  }

  function openActivityPanel() {
    if (!activityPanel) return;
    activityPanel.classList.add("open");
    activityPanel.setAttribute("aria-hidden", "false");
    activities = activities.map((item) => ({ ...item, read: true }));
    renderActivityList();
    updateActivityBadge();
  }

  function closeActivityPanel() {
    if (!activityPanel) return;
    activityPanel.classList.remove("open");
    activityPanel.setAttribute("aria-hidden", "true");
  }

  function openSaveDialog(message) {
    if (!saveModal) return Promise.resolve("cancel");
    if (saveMessage) {
      saveMessage.textContent = message || t("save.changesMessage");
    }
    saveModal.classList.add("open");
    saveModal.setAttribute("aria-hidden", "false");
    return new Promise((resolve) => {
      saveDialogResolver = resolve;
    });
  }

  function closeSaveDialog(result) {
    if (!saveModal) return;
    saveModal.classList.remove("open");
    saveModal.setAttribute("aria-hidden", "true");
    if (saveDialogResolver) {
      saveDialogResolver(result);
      saveDialogResolver = null;
    }
  }

  function openFormatDialog() {
    if (!formatModal) return Promise.resolve(null);
    formatModal.classList.add("open");
    formatModal.setAttribute("aria-hidden", "false");
    const defaultFormat = "txt";
    formatButtons.forEach((button) => {
      if (button.dataset.formatAction === "cancel") return;
      button.classList.remove("primary-btn");
      button.classList.add("secondary-btn");
    });
    formatButtons.forEach((button) => {
      if (button.dataset.formatAction === defaultFormat) {
        button.classList.remove("secondary-btn");
        button.classList.add("primary-btn");
      }
    });
    return new Promise((resolve) => {
      formatDialogResolver = resolve;
    });
  }

  function closeFormatDialog(result) {
    if (!formatModal) return;
    formatModal.classList.remove("open");
    formatModal.setAttribute("aria-hidden", "true");
    if (formatDialogResolver) {
      formatDialogResolver(result);
      formatDialogResolver = null;
    }
  }

  function getExportFolder() {
    return localStorage.getItem("lp:exportFolder") || "";
  }

  function openConfirmOverwriteDialog(filePath) {
    if (!saveModal) return Promise.resolve("cancel");
    if (saveMessage) {
      const name = filePath ? filePath.split(/[\\/]/).pop() : "this file";
      saveMessage.textContent = t("save.overwriteMessage").replace("{name}", name);
    }
    saveModal.classList.add("open");
    saveModal.setAttribute("aria-hidden", "false");
    return new Promise((resolve) => {
      saveDialogResolver = resolve;
    });
  }

  function openMissingFileDialog(filePath, tabId) {
    if (!missingFileModal) return;
    missingFileTabId = tabId || "";
    const message = filePath ? `Cannot find the file:\n${filePath}` : "Cannot find the file.";
    if (missingFileMessage) {
      missingFileMessage.textContent = message;
    }
    missingFileModal.classList.add("open");
    missingFileModal.setAttribute("aria-hidden", "false");
  }

  function closeMissingFileDialog() {
    if (!missingFileModal) return;
    missingFileModal.classList.remove("open");
    missingFileModal.setAttribute("aria-hidden", "true");
    missingFileTabId = "";
  }

  function loadTrash() {
    try {
      const stored = localStorage.getItem("lp:trash");
      trashItems = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(trashItems)) {
        trashItems = [];
      }
    } catch (_error) {
      trashItems = [];
    }
  }

  function saveTrash() {
    localStorage.setItem("lp:trash", JSON.stringify(trashItems));
  }

  function renderTrash() {
    if (!trashList) return;
    trashList.innerHTML = "";
    if (!trashItems.length) {
      const empty = document.createElement("div");
      empty.className = "trash-empty";
      empty.textContent = t("trash.empty");
      trashList.appendChild(empty);
      return;
    }
    trashItems.forEach((item) => {
      const row = document.createElement("div");
      row.className = "trash-item";
      row.innerHTML = `
        <div>
          <div class="trash-item-title">${escapeHtml(item.title || t("tab.untitled"))}</div>
          <div class="trash-item-meta">${item.filePath ? escapeHtml(item.filePath) : t("trash.unsaved")}</div>
        </div>
        <div class="trash-actions">
          <button class="secondary-btn" data-trash-id="${item.id}" data-trash-action="restore">${t("trash.restore")}</button>
          <button class="secondary-btn" data-trash-id="${item.id}" data-trash-action="delete">${t("trash.delete")}</button>
        </div>
      `;
      trashList.appendChild(row);
    });
  }

  function openTrashModal() {
    if (!trashPage) return;
    closeSettingsPage();
    closeMenus();
    renderTrash();
    trashPage.classList.remove("closing");
    trashPage.classList.add("open");
    trashPage.setAttribute("aria-hidden", "false");
  }

  function closeTrashModal() {
    if (!trashPage) return;
    if (!trashPage.classList.contains("open")) return;
    if (document.body.classList.contains("reduce-motion")) {
      trashPage.classList.remove("open", "closing");
      trashPage.setAttribute("aria-hidden", "true");
      return;
    }
    trashPage.classList.add("closing");
    const handleClose = (event) => {
      if (event.target !== trashPage) return;
      trashPage.classList.remove("open", "closing");
      trashPage.setAttribute("aria-hidden", "true");
      trashPage.removeEventListener("transitionend", handleClose);
    };
    trashPage.addEventListener("transitionend", handleClose);
  }

  function toggleActivityPanel() {
    if (!activityPanel) return;
    if (activityPanel.classList.contains("open")) {
      closeActivityPanel();
    } else {
      openActivityPanel();
    }
  }

  function updateActivityBadge() {
    if (!activityBadge) return;
    const unread = activities.filter((item) => !item.read).length;
    if (unread <= 0) {
      activityBadge.classList.remove("show");
      return;
    }
    activityBadge.classList.add("show");
    activityBadge.textContent = unread >= 3 ? "3+" : String(unread);
  }

  function formatActivityTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function getActivityIcon(type) {
    switch (type) {
      case "update":
        return "refresh-cw";
      case "download":
        return "download";
      case "export":
        return "share";
      case "autosave":
        return "save";
      case "error":
        return "triangle-alert";
      default:
        return "bell";
    }
  }

  function addActivity(item) {
    const prepared = {
      id: `${Date.now()}-${Math.random()}`,
      read: false,
      timestamp: Date.now(),
      actions: [],
      ...item
    };
    if (Array.isArray(prepared.actions)) {
      prepared.actions = prepared.actions.map((action, index) => ({
        id: action.id || `${prepared.id}-action-${index}`,
        label: action.label || "Action",
        handler: action.handler
      }));
    }
    activities = [prepared, ...activities].slice(0, 50);
    renderActivityList();
    updateActivityBadge();
  }

  function renderActivityList() {
    if (!activityList) return;
    activityList.innerHTML = "";
    if (activities.length === 0) {
      const empty = document.createElement("div");
      empty.className = "activity-empty";
      empty.textContent = t("activity.empty");
      activityList.appendChild(empty);
      return;
    }
    activities.forEach((item) => {
      const row = document.createElement("div");
      row.className = `activity-item${item.read ? "" : " unread"}`;
      row.innerHTML = `
        <div class="activity-icon"><i data-lucide="${getActivityIcon(item.type)}"></i></div>
        <div>
          <div class="activity-title">${escapeHtml(item.title)}</div>
          <div class="activity-time">${formatActivityTime(item.timestamp)}</div>
          ${item.actions?.length ? `<div class="activity-actions">${item.actions.map((action) => `<button data-activity-id="${item.id}" data-activity-action="${action.id}">${escapeHtml(action.label)}</button>`).join("")}</div>` : ""}
        </div>
      `;
      renderLucideIcons(row);
      activityList.appendChild(row);
    });
  }

  function compareVersions(a, b) {
    const splitA = a.split(".").map((part) => parseInt(part, 10));
    const splitB = b.split(".").map((part) => parseInt(part, 10));
    const maxLen = Math.max(splitA.length, splitB.length);
    for (let i = 0; i < maxLen; i += 1) {
      const valA = splitA[i] || 0;
      const valB = splitB[i] || 0;
      if (valA !== valB) return valB - valA;
    }
    return 0;
  }

  function buildSection(title, items) {
    if (!Array.isArray(items) || items.length === 0) return "";
    const list = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    return `<div class="changelog-section"><h4>${escapeHtml(title)}</h4><ul>${list}</ul></div>`;
  }

  function getChangelogPlainText(version, entry) {
    const lines = [`LucidPad v${version}`];
    if (entry?.date) {
      lines.push(`Date: ${entry.date}`);
    }
    const sections = [
      ["Added", entry?.added],
      ["Improved", entry?.improved],
      ["Fixed", entry?.fixed]
    ];
    sections.forEach(([title, items]) => {
      if (Array.isArray(items) && items.length > 0) {
        lines.push(`${title}:`);
        items.forEach((item) => lines.push(`- ${item}`));
      }
    });
    if (lines.length === 1) {
      lines.push("Release notes are not available for this version.");
    }
    return lines.join("\n");
  }

  function renderChangelog(version) {
    if (!changelogBody || !changelogTitle) return;
    const entry = changelogData[version] || {};
    activeChangelogVersion = version;
    changelogTitle.textContent = `Changelog - v${version}`;
    if (changelogDate) {
      changelogDate.textContent = entry.date ? `Released ${entry.date}` : "";
    }
    const sections = [
      buildSection("Added", entry.added),
      buildSection("Improved", entry.improved),
      buildSection("Fixed", entry.fixed)
    ].join("");
    if (sections) {
      changelogBody.innerHTML = sections;
    } else {
      changelogBody.innerHTML = "<p>Release notes are not available for this version.</p>";
    }
    const items = changelogList?.querySelectorAll(".changelog-item") || [];
    items.forEach((item) => {
      item.classList.toggle("active", item.dataset.version === version);
    });
  }

  function renderChangelogList(filterText) {
    if (!changelogList) return;
    changelogList.innerHTML = "";
    const normalized = (filterText || "").trim().toLowerCase();
    const filtered = changelogVersions.filter((version) => {
      if (!normalized) return true;
      const entry = changelogData[version] || {};
      const blob = JSON.stringify(entry).toLowerCase();
      return version.toLowerCase().includes(normalized) || blob.includes(normalized);
    });
    const latest = changelogVersions[0];
    filtered.forEach((version) => {
      const item = document.createElement("div");
      item.className = "changelog-item";
      item.dataset.version = version;
      item.innerHTML = `
        <span>v${version}</span>
        ${version === latest ? '<span class="changelog-latest">Latest</span>' : ""}
      `;
      item.addEventListener("click", () => renderChangelog(version));
      changelogList.appendChild(item);
    });
    if (filtered.length > 0 && !filtered.includes(activeChangelogVersion)) {
      renderChangelog(filtered[0]);
    }
  }

  async function loadChangelog() {
    try {
      const response = await fetch("release-notes.json", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      changelogData = data || {};
      changelogVersions = Object.keys(changelogData).sort(compareVersions);
      renderChangelogList(changelogSearch?.value || "");
    } catch (_error) {
      changelogData = {};
      changelogVersions = [];
      renderChangelogList("");
    }
  }

  function openUpdateModal(version) {
    if (!updateModal) return;
    pendingUpdateVersion = version || "";
    if (updateVersionText) {
      const label = version ? `Version ${version} includes performance improvements and new features.` : "A new version includes performance improvements and new features.";
      updateVersionText.textContent = label;
    }
    updateModal.classList.add("open");
    updateModal.setAttribute("aria-hidden", "false");
  }

  function closeUpdateModal() {
    if (!updateModal) return;
    updateModal.classList.remove("open");
    updateModal.setAttribute("aria-hidden", "true");
  }

  function openOnboardModal() {
    if (!onboardModal) return;
    setOnboardStep("language");
    syncOnboardLanguageOptions();
    syncOnboardAccentOptions();
    onboardModal.classList.add("open");
    onboardModal.setAttribute("aria-hidden", "false");
  }

  function closeOnboardModal() {
    if (!onboardModal) return;
    onboardModal.classList.remove("open");
    onboardModal.setAttribute("aria-hidden", "true");
  }

  function openWelcomeModal() {
    if (!welcomeModal) return;
    welcomeModal.classList.add("open");
    welcomeModal.setAttribute("aria-hidden", "false");
  }

  function closeWelcomeModal() {
    if (!welcomeModal) return;
    welcomeModal.classList.remove("open");
    welcomeModal.setAttribute("aria-hidden", "true");
  }

  async function getAppVersion() {
    if (appVersionCache) return appVersionCache;
    if (!api) return "";
    const result = await api.action("app:version");
    appVersionCache = result?.version || "";
    return appVersionCache;
  }

  function buildTourSteps() {
    const steps = [
      {
        elements: [
          '.menubar .menu-item[data-menu="file"]',
          '.menubar .menu-item[data-menu="edit"]',
          '.menubar .menu-item[data-menu="view"]',
          '.menubar .menu-item[data-menu="help"]'
        ],
        padding: 4,
        popover: {
          title: t("tour.steps.menu.title"),
          description: t("tour.steps.menu.description")
        }
      },
      {
        element: '[data-tour="tabs"]',
        popover: {
          title: t("tour.steps.tabs.title"),
          description: t("tour.steps.tabs.description")
        }
      },
      {
        element: '[data-tour="editor"]',
        padding: 6,
        maxHeight: 280,
        offsetY: -12,
        placeInside: true,
        alignTop: true,
        noScroll: true,
        clampToHeader: true,
        popover: {
          title: t("tour.steps.editor.title"),
          description: t("tour.steps.editor.description")
        }
      },
      {
        element: '[data-tour="toolbar"]',
        popover: {
          title: t("tour.steps.formatting.title"),
          description: t("tour.steps.formatting.description")
        }
      },
      {
        element: '[data-tour="search"]',
        popover: {
          title: t("tour.steps.search.title"),
          description: t("tour.steps.search.description")
        }
      },
      {
        element: '[data-tour="side-panel"]',
        popover: {
          title: t("tour.steps.sidePanel.title"),
          description: t("tour.steps.sidePanel.description")
        }
      },
      {
        element: '[data-tour="settings"]',
        popover: {
          title: t("tour.steps.settings.title"),
          description: t("tour.steps.settings.description")
        }
      }
    ];
    return steps.filter((step) => {
      if (step.elements) {
        return step.elements.some((selector) => document.querySelector(selector));
      }
      return document.querySelector(step.element);
    });
  }

  function startInteractiveTour() {
    tourSteps = buildTourSteps();
    if (!tourSteps.length) {
      showNotification(t("toast.tourTargetsMissing"));
      return;
    }
    tourHistory = [];
    const first = findNextTourIndex(-1, 1);
    if (first === -1) {
      showNotification(t("toast.tourTargetsMissing"));
      return;
    }
    openTourAt(first);
  }

  function openTourAt(index) {
    if (!tourOverlay) return;
    tourLastIndex = tourIndex;
    tourIndex = Math.max(0, Math.min(index, tourSteps.length - 1));
    tourOverlay.classList.add("open");
    tourOverlay.setAttribute("aria-hidden", "false");
    updateTourStep();
  }

  function closeTour() {
    if (!tourOverlay) return;
    tourOverlay.classList.remove("open");
    tourOverlay.setAttribute("aria-hidden", "true");
    tourIndex = -1;
    tourAnchor = null;
    tourHistory = [];
  }

  function stepHasTarget(step) {
    if (step.elements) {
      return step.elements.some((selector) => document.querySelector(selector));
    }
    return !!document.querySelector(step.element);
  }

  function findNextTourIndex(fromIndex, direction) {
    let probe = fromIndex + direction;
    while (probe >= 0 && probe < tourSteps.length) {
      if (stepHasTarget(tourSteps[probe])) {
        return probe;
      }
      probe += direction;
    }
    return -1;
  }

  function updateTourStep() {
    if (tourIndex < 0 || tourIndex >= tourSteps.length) return;
    const step = tourSteps[tourIndex];
    let anchorEl = null;
    if (step.elements) {
      const matches = step.elements
        .map((selector) => document.querySelector(selector))
        .filter(Boolean);
      if (matches.length) {
        const left = Math.min(...matches.map((node) => node.getBoundingClientRect().left));
        const top = Math.min(...matches.map((node) => node.getBoundingClientRect().top));
        anchorEl = matches.find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.left === left && rect.top === top;
        }) || matches.find((node) => node.getBoundingClientRect().left === left) || matches[0];
      }
    } else {
      anchorEl = document.querySelector(step.element);
    }
    if (!anchorEl) {
      const direction = tourIndex < tourLastIndex ? -1 : 1;
      const foundIndex = findNextTourIndex(tourIndex, direction);
      if (foundIndex !== -1) {
        openTourAt(foundIndex);
      } else {
        closeTour();
      }
      return;
    }
    tourAnchor = anchorEl;
    if (!step.noScroll) {
      const behavior = document.body.classList.contains("reduce-motion") ? "auto" : "smooth";
      anchorEl.scrollIntoView({ block: "center", inline: "nearest", behavior });
    }
    const applyStep = () => {
    if (tourTitle) tourTitle.textContent = step.popover?.title || t("tour.title");
    if (tourDesc) tourDesc.textContent = step.popover?.description || "";
    if (tourProgress) tourProgress.textContent = `${tourIndex + 1}/${tourSteps.length}`;
      requestAnimationFrame(() => requestAnimationFrame(positionTour));
      updateTourButtons();
    };
    applyStep();
  }

  function updateTourButtons() {
    if (!tourButtons.length) return;
    const prevBtn = tourButtons.find((btn) => btn.dataset.tourAction === "prev");
    const nextBtn = tourButtons.find((btn) => btn.dataset.tourAction === "next");
    const skipBtn = tourButtons.find((btn) => btn.dataset.tourAction === "skip");
    if (prevBtn) {
      prevBtn.textContent = t("tour.back");
      prevBtn.disabled = tourIndex <= 0;
    }
    if (nextBtn) {
      nextBtn.textContent = tourIndex >= tourSteps.length - 1 ? t("tour.finish") : t("tour.next");
    }
    if (skipBtn) skipBtn.textContent = t("tour.skip");
  }

  function positionTour() {
    if (!tourAnchor || !tourHighlight || !tourCard) return;
    const step = tourSteps[tourIndex] || {};
    const padding = Number.isFinite(step.padding) ? step.padding : 10;
    let rect = tourAnchor.getBoundingClientRect();
    if (step.elements) {
      const rects = step.elements
        .map((selector) => document.querySelector(selector))
        .filter(Boolean)
        .map((el) => el.getBoundingClientRect());
      if (rects.length) {
        const left = Math.min(...rects.map((r) => r.left));
        const top = Math.min(...rects.map((r) => r.top));
        const right = Math.max(...rects.map((r) => r.right));
        const bottom = Math.max(...rects.map((r) => r.bottom));
        rect = { left, top, right, bottom, width: right - left, height: bottom - top };
      }
    }
    const headerRect = document.querySelector("header")?.getBoundingClientRect();
    if (step.clampToHeader && headerRect && rect.top < headerRect.bottom + padding) {
      const delta = headerRect.bottom + padding - rect.top;
      rect = {
        ...rect,
        top: rect.top + delta,
        height: Math.max(40, rect.height - delta),
        bottom: rect.top + delta + Math.max(40, rect.height - delta)
      };
    }
    if (Number.isFinite(step.maxWidth) && rect.width > step.maxWidth) {
      const delta = rect.width - step.maxWidth;
      rect = {
        ...rect,
        width: step.maxWidth,
        left: rect.left + delta / 2,
        right: rect.left + delta / 2 + step.maxWidth
      };
    }
    if (Number.isFinite(step.maxHeight) && rect.height > step.maxHeight) {
      if (step.alignTop) {
        rect = {
          ...rect,
          height: step.maxHeight,
          bottom: rect.top + step.maxHeight
        };
      } else {
        const delta = rect.height - step.maxHeight;
        rect = {
          ...rect,
          height: step.maxHeight,
          top: rect.top + delta / 2,
          bottom: rect.top + delta / 2 + step.maxHeight
        };
      }
    }
    const highlight = {
      top: Math.max(rect.top - padding, 6),
      left: Math.max(rect.left - padding, 6),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2
    };
    tourHighlight.style.top = `${highlight.top}px`;
    tourHighlight.style.left = `${highlight.left}px`;
    tourHighlight.style.width = `${highlight.width}px`;
    tourHighlight.style.height = `${highlight.height}px`;

    const cardRect = tourCard.getBoundingClientRect();
    const spaceBelow = window.innerHeight - (rect.bottom + padding);
    const placeBelow = spaceBelow > cardRect.height + 20;
    if (step.placeInside) {
      const top = rect.top + padding;
      const left = Math.min(
        Math.max(rect.left + padding, 12),
        window.innerWidth - cardRect.width - 12
      );
      tourCard.style.top = `${top}px`;
      tourCard.style.left = `${left}px`;
    } else {
      const offsetY = Number.isFinite(step.offsetY) ? step.offsetY : 0;
      const top = placeBelow
        ? rect.bottom + padding + offsetY
        : Math.max(rect.top - cardRect.height - padding + offsetY, 10);
      const left = Math.min(
        Math.max(rect.left, 12),
        window.innerWidth - cardRect.width - 12
      );
      tourCard.style.top = `${top}px`;
      tourCard.style.left = `${left}px`;
    }
  }

  function formatBytes(value) {
    if (value <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
    const size = value / Math.pow(1024, index);
    return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[index]}`;
  }

  function formatEta(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function openDownloadOverlay() {
    if (!downloadOverlay) return;
    downloadOverlay.classList.add("open");
    downloadOverlay.setAttribute("aria-hidden", "false");
  }

  function closeDownloadOverlay() {
    if (!downloadOverlay) return;
    downloadOverlay.classList.remove("open");
    downloadOverlay.setAttribute("aria-hidden", "true");
  }

  function updateDownloadButtons() {
    const pauseBtn = downloadButtons.find((btn) => btn.dataset.downloadAction === "pause");
    const cancelBtn = downloadButtons.find((btn) => btn.dataset.downloadAction === "cancel");
    const openBtn = downloadButtons.find((btn) => btn.dataset.downloadAction === "open");
    if (pauseBtn) {
      pauseBtn.textContent = downloadPaused ? "Resume" : "Pause";
      pauseBtn.disabled = downloadStage !== "downloading" || downloadMode !== "file";
    }
    if (cancelBtn) {
      cancelBtn.textContent = downloadStage === "ready" ? "Close" : "Cancel";
      cancelBtn.disabled = downloadMode === "update" && downloadStage === "downloading";
    }
    if (openBtn) {
      openBtn.disabled = !activeDownloadPath;
    }
  }

  function replaceText() {
    const findValue = prompt("Find:", findInput?.value || "");
    if (!findValue) return;
    const replaceValue = prompt("Replace with:", "");
    if (replaceValue === null) return;
    const text = getEditorText();
    setEditorText(text.split(findValue).join(replaceValue));
    updateStatus();
    updatePreview();
    const tab = tabs.get(activeTabId);
    if (tab) {
      tab.contentHtml = getEditorHTML();
      setTabDirty(tab, true);
    }
  }
  function goToLine() {
    const input = prompt("Go to line:", "1");
    if (!input) return;
    const lineNumber = Math.max(1, parseInt(input, 10));
    if (Number.isNaN(lineNumber)) return;
    const text = getEditorText();
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
    if (isPlainMode && plainEditorInstance) {
      const info = plainEditorInstance.getStatus();
      statusLnCol.textContent = `${t("footer.line")} ${info.line}, ${t("footer.column")} ${info.col}`;
      statusChars.textContent = `${info.chars} ${t("footer.chars")}`;
      return;
    }
    const text = getEditorText();
    const index = getSelectionIndex();
    const before = text.slice(0, index);
    const line = before.split("\n").length;
    const col = before.length - before.lastIndexOf("\n");
    statusLnCol.textContent = `${t("footer.line")} ${line}, ${t("footer.column")} ${col}`;
    statusChars.textContent = `${text.length} ${t("footer.chars")}`;
  }

  let statusUpdateTimer = 0;
  let previewUpdateTimer = 0;
  let persistTabsTimer = 0;
  let caretUpdateFrame = 0;
  let lineHighlightFrame = 0;

  function scheduleStatusUpdate() {
    if (statusUpdateTimer) return;
    statusUpdateTimer = setTimeout(() => {
      statusUpdateTimer = 0;
      updateStatus();
    }, 80);
  }

  function schedulePreviewUpdate() {
    if (previewUpdateTimer) return;
    previewUpdateTimer = setTimeout(() => {
      previewUpdateTimer = 0;
      updatePreview();
    }, 120);
  }

  function schedulePersistTabs() {
    if (persistTabsTimer) {
      clearTimeout(persistTabsTimer);
    }
    persistTabsTimer = setTimeout(() => {
      persistTabsTimer = 0;
      persistTabs();
    }, 400);
  }

  function scheduleCustomCaretUpdate() {
    if (caretUpdateFrame) return;
    caretUpdateFrame = requestAnimationFrame(() => {
      caretUpdateFrame = 0;
    });
  }

  function setTheme(_theme) {
    document.body.classList.remove("theme-light");
  }

  function updateLineHighlight() {
    if (!lineHighlight || !editorScroll) return;
    if (!isLineHighlightEnabled || isPlainMode) {
      lineHighlight.classList.remove("is-visible");
      return;
    }
    const range = getActiveEditorRange();
    if (!range) {
      lineHighlight.classList.remove("is-visible");
      return;
    }
    const collapsed = range.cloneRange();
    collapsed.collapse(true);
    const rects = collapsed.getClientRects();
    if (!rects.length) {
      lineHighlight.classList.remove("is-visible");
      return;
    }
    const rect = rects[0];
    const scrollRect = editorScroll.getBoundingClientRect();
    const top = rect.top - scrollRect.top + editorScroll.scrollTop;
    const height = rect.height || parseFloat(getComputedStyle(editor).lineHeight) || 20;
    lineHighlight.style.top = `${top}px`;
    lineHighlight.style.height = `${height}px`;
    lineHighlight.classList.add("is-visible");
  }

  function scheduleLineHighlight() {
    if (lineHighlightFrame) return;
    lineHighlightFrame = requestAnimationFrame(() => {
      lineHighlightFrame = 0;
      updateLineHighlight();
    });
  }

  function htmlToPlainText(html) {
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    return (doc.body?.textContent || "").replace(/\u00a0/g, " ");
  }

  class PlainTextEditor {
    constructor({ scrollEl, canvas, spacer, input, onChange, onCursor }) {
      this.scrollEl = scrollEl;
      this.canvas = canvas;
      this.spacer = spacer;
      this.input = input;
      this.ctx = canvas?.getContext("2d");
      this.lines = [""];
      this.cursor = { line: 0, col: 0 };
      this.totalLength = 0;
      this.fontFamily = "monospace";
      this.fontSize = 16;
      this.lineHeight = 22;
      this.dpr = window.devicePixelRatio || 1;
      this.isFocused = false;
      this.undoStack = [];
      this.redoStack = [];
      this.renderFrame = 0;
      this.onChange = typeof onChange === "function" ? onChange : null;
      this.onCursor = typeof onCursor === "function" ? onCursor : null;
      this.initEvents();
      this.updateMetricsFromEditor();
      this.resizeCanvas();
      this.render();
    }

    notifyChange() {
      if (this.onChange) {
        this.onChange();
      }
    }

    notifyCursor() {
      if (this.onCursor) {
        this.onCursor();
      }
    }

    initEvents() {
      if (!this.scrollEl || !this.canvas || !this.input) return;
      this.scrollEl.addEventListener("scroll", () => this.scheduleRender());
      this.scrollEl.addEventListener("mousedown", (event) => {
        event.preventDefault();
        this.focus();
        this.setCursorFromPoint(event.clientX, event.clientY);
      });
      this.input.addEventListener("input", (event) => {
        const text = event.target.value;
        if (text) {
          this.insertText(text);
          event.target.value = "";
        }
      });
      this.input.addEventListener("keydown", (event) => {
        if (event.ctrlKey || event.metaKey) {
          const key = event.key.toLowerCase();
          if (key === "z") {
            event.preventDefault();
            if (event.shiftKey) {
              this.redo();
            } else {
              this.undo();
            }
            return;
          }
          if (key === "y") {
            event.preventDefault();
            this.redo();
            return;
          }
          return;
        }
        switch (event.key) {
          case "Backspace":
            event.preventDefault();
            this.backspace();
            return;
          case "Delete":
            event.preventDefault();
            this.deleteForward();
            return;
          case "Enter":
            event.preventDefault();
            this.insertText("\n");
            return;
          case "ArrowLeft":
            event.preventDefault();
            this.moveCursor(-1, 0);
            return;
          case "ArrowRight":
            event.preventDefault();
            this.moveCursor(1, 0);
            return;
          case "ArrowUp":
            event.preventDefault();
            this.moveCursor(0, -1);
            return;
          case "ArrowDown":
            event.preventDefault();
            this.moveCursor(0, 1);
            return;
          case "Home":
            event.preventDefault();
            this.cursor.col = 0;
            this.ensureCursorVisible();
            this.scheduleRender();
            return;
          case "End":
            event.preventDefault();
            this.cursor.col = this.currentLine().length;
            this.ensureCursorVisible();
            this.scheduleRender();
            return;
          case "PageUp":
            event.preventDefault();
            this.scrollByLines(-Math.floor(this.scrollEl.clientHeight / this.lineHeight));
            return;
          case "PageDown":
            event.preventDefault();
            this.scrollByLines(Math.floor(this.scrollEl.clientHeight / this.lineHeight));
            return;
          default:
            return;
        }
      });
      this.input.addEventListener("focus", () => {
        this.isFocused = true;
        this.scheduleRender();
      });
      this.input.addEventListener("blur", () => {
        this.isFocused = false;
        this.scheduleRender();
      });
      window.addEventListener("resize", () => {
        this.resizeCanvas();
        this.scheduleRender();
      });
    }

    updateMetricsFromEditor() {
      if (!editor) return;
      const style = getComputedStyle(editor);
      this.fontFamily = style.fontFamily || "monospace";
      const fontSize = parseFloat(style.fontSize);
      this.fontSize = Number.isFinite(fontSize) ? fontSize : 16;
      const lineHeight = parseFloat(style.lineHeight);
      this.lineHeight = Number.isFinite(lineHeight) ? lineHeight : Math.round(this.fontSize * 1.6);
      if (this.ctx) {
        this.ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        this.ctx.textBaseline = "top";
        this.ctx.fillStyle = "#e4e4e7";
      }
      this.updateSpacer();
    }

    resizeCanvas() {
      if (!this.canvas || !this.scrollEl) return;
      const rect = this.scrollEl.getBoundingClientRect();
      this.dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.floor(rect.width * this.dpr);
      this.canvas.height = Math.floor(rect.height * this.dpr);
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
      if (this.ctx) {
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      }
    }

    setText(text) {
      const normalized = (text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      this.lines = normalized.split("\n");
      if (this.lines.length === 0) {
        this.lines = [""];
      }
      this.totalLength = normalized.length;
      this.cursor.line = Math.min(this.cursor.line, this.lines.length - 1);
      this.cursor.col = Math.min(this.cursor.col, this.currentLine().length);
      this.undoStack = [];
      this.redoStack = [];
      this.updateSpacer();
      this.scheduleRender();
    }

    getText() {
      return this.lines.join("\n");
    }

    getStatus() {
      return {
        line: this.cursor.line + 1,
        col: this.cursor.col + 1,
        chars: this.totalLength
      };
    }

    getCursorPosition() {
      return { line: this.cursor.line, col: this.cursor.col };
    }

    setCursorPosition(line, col) {
      const safeLine = Math.max(0, Math.min(this.lines.length - 1, line));
      this.cursor.line = safeLine;
      this.cursor.col = Math.max(0, Math.min(this.currentLine().length, col));
      this.ensureCursorVisible();
      this.scheduleRender();
      this.notifyCursor();
    }

    currentLine() {
      return this.lines[this.cursor.line] || "";
    }

    updateSpacer() {
      if (!this.spacer) return;
      const height = Math.max(1, this.lines.length * this.lineHeight);
      this.spacer.style.height = `${height}px`;
    }

    scheduleRender() {
      if (this.renderFrame) return;
      this.renderFrame = requestAnimationFrame(() => {
        this.renderFrame = 0;
        this.render();
      });
    }

    render() {
      if (!this.ctx || !this.canvas || !this.scrollEl) return;
      const ctx = this.ctx;
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);
      const scrollTop = this.scrollEl.scrollTop;
      const startLine = Math.max(0, Math.floor(scrollTop / this.lineHeight));
      const offsetY = -(scrollTop % this.lineHeight);
      const visibleLines = Math.ceil(height / this.lineHeight) + 3;
      let y = offsetY;
      for (let i = 0; i < visibleLines; i += 1) {
        const lineIndex = startLine + i;
        if (lineIndex >= this.lines.length) break;
        const lineText = this.lines[lineIndex];
        ctx.fillText(lineText, 16, y);
        y += this.lineHeight;
      }
      if (this.isFocused) {
        const caretY = this.cursor.line * this.lineHeight - scrollTop;
        const caretText = this.currentLine().slice(0, this.cursor.col);
        const caretX = 16 + ctx.measureText(caretText).width;
        ctx.fillRect(caretX, caretY + 2, 2, this.lineHeight - 4);
      }
    }

    focus() {
      this.input?.focus();
    }

    setCursorFromPoint(clientX, clientY) {
      if (!this.scrollEl || !this.ctx) return;
      const rect = this.scrollEl.getBoundingClientRect();
      const x = clientX - rect.left - 16;
      const y = clientY - rect.top + this.scrollEl.scrollTop;
      const line = Math.max(0, Math.min(this.lines.length - 1, Math.floor(y / this.lineHeight)));
      const lineText = this.lines[line] || "";
      let low = 0;
      let high = lineText.length;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        const width = this.ctx.measureText(lineText.slice(0, mid)).width;
        if (width < x) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
      this.cursor.line = line;
      this.cursor.col = Math.max(0, Math.min(lineText.length, low));
      this.ensureCursorVisible();
      this.scheduleRender();
      this.notifyCursor();
    }

    ensureCursorVisible() {
      if (!this.scrollEl) return;
      const top = this.cursor.line * this.lineHeight;
      const bottom = top + this.lineHeight;
      const viewTop = this.scrollEl.scrollTop;
      const viewBottom = viewTop + this.scrollEl.clientHeight;
      if (top < viewTop) {
        this.scrollEl.scrollTop = top;
      } else if (bottom > viewBottom) {
        this.scrollEl.scrollTop = bottom - this.scrollEl.clientHeight;
      }
    }

    moveCursor(dx, dy) {
      if (dy !== 0) {
        const nextLine = Math.max(0, Math.min(this.lines.length - 1, this.cursor.line + dy));
        this.cursor.line = nextLine;
        this.cursor.col = Math.min(this.cursor.col, this.currentLine().length);
      }
      if (dx !== 0) {
        let nextCol = this.cursor.col + dx;
        if (nextCol < 0 && this.cursor.line > 0) {
          this.cursor.line -= 1;
          this.cursor.col = this.currentLine().length;
        } else if (nextCol > this.currentLine().length && this.cursor.line < this.lines.length - 1) {
          this.cursor.line += 1;
          this.cursor.col = 0;
        } else {
          this.cursor.col = Math.max(0, Math.min(this.currentLine().length, nextCol));
        }
      }
      this.ensureCursorVisible();
      this.scheduleRender();
      this.notifyCursor();
    }

    insertText(text, record = true) {
      const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      if (!normalized) return;
      const startLine = this.cursor.line;
      const startCol = this.cursor.col;
      const parts = normalized.split("\n");
      const lineText = this.currentLine();
      const before = lineText.slice(0, this.cursor.col);
      const after = lineText.slice(this.cursor.col);
      if (parts.length === 1) {
        this.lines[this.cursor.line] = before + parts[0] + after;
        this.cursor.col += parts[0].length;
      } else {
        this.lines[this.cursor.line] = before + parts[0];
        const tail = parts[parts.length - 1];
        const middle = parts.slice(1, -1);
        const insertLines = [...middle, tail + after];
        this.lines.splice(this.cursor.line + 1, 0, ...insertLines);
        this.cursor.line += parts.length - 1;
        this.cursor.col = tail.length;
      }
      this.totalLength += normalized.length;
      if (record) {
        this.undoStack.push({ type: "insert", line: startLine, col: startCol, text: normalized });
        this.redoStack = [];
      }
      this.updateSpacer();
      this.ensureCursorVisible();
      this.scheduleRender();
      this.notifyChange();
    }

    deleteRange(line, col, text, record = true) {
      if (!text) return;
      const parts = text.split("\n");
      const firstLine = this.lines[line] || "";
      const before = firstLine.slice(0, col);
      if (parts.length === 1) {
        const after = firstLine.slice(col + text.length);
        this.lines[line] = before + after;
      } else {
        const lastLineIndex = line + parts.length - 1;
        const lastLine = this.lines[lastLineIndex] || "";
        const after = lastLine.slice(parts[parts.length - 1].length);
        this.lines[line] = before + after;
        this.lines.splice(line + 1, parts.length - 1);
      }
      this.cursor.line = line;
      this.cursor.col = col;
      this.totalLength -= text.length;
      if (record) {
        this.undoStack.push({ type: "delete", line, col, text });
        this.redoStack = [];
      }
      this.updateSpacer();
      this.ensureCursorVisible();
      this.scheduleRender();
      this.notifyChange();
    }

    backspace() {
      if (this.cursor.col > 0) {
        const lineText = this.currentLine();
        const removed = lineText.charAt(this.cursor.col - 1);
        this.deleteRange(this.cursor.line, this.cursor.col - 1, removed);
        this.cursor.col -= 0;
        return;
      }
      if (this.cursor.line > 0) {
        const prevLine = this.lines[this.cursor.line - 1];
        const currentLine = this.currentLine();
        const removed = "\n";
        const newCol = prevLine.length;
        this.lines[this.cursor.line - 1] = prevLine + currentLine;
        this.lines.splice(this.cursor.line, 1);
        this.cursor.line -= 1;
        this.cursor.col = newCol;
        this.totalLength -= 1;
        this.undoStack.push({ type: "delete", line: this.cursor.line, col: newCol, text: removed });
        this.redoStack = [];
        this.updateSpacer();
        this.ensureCursorVisible();
        this.scheduleRender();
        this.notifyChange();
      }
    }

    deleteForward() {
      const lineText = this.currentLine();
      if (this.cursor.col < lineText.length) {
        const removed = lineText.charAt(this.cursor.col);
        this.deleteRange(this.cursor.line, this.cursor.col, removed);
        return;
      }
      if (this.cursor.line < this.lines.length - 1) {
        const nextLine = this.lines[this.cursor.line + 1];
        this.lines[this.cursor.line] = lineText + nextLine;
        this.lines.splice(this.cursor.line + 1, 1);
        this.totalLength -= 1;
        this.undoStack.push({ type: "delete", line: this.cursor.line, col: lineText.length, text: "\n" });
        this.redoStack = [];
        this.updateSpacer();
        this.ensureCursorVisible();
        this.scheduleRender();
        this.notifyChange();
      }
    }

    undo() {
      const op = this.undoStack.pop();
      if (!op) return;
      if (op.type === "insert") {
        this.deleteRange(op.line, op.col, op.text, false);
        this.redoStack.push(op);
      } else if (op.type === "delete") {
        this.cursor.line = op.line;
        this.cursor.col = op.col;
        this.insertText(op.text, false);
        this.redoStack.push(op);
      }
      this.notifyChange();
    }

    redo() {
      const op = this.redoStack.pop();
      if (!op) return;
      if (op.type === "insert") {
        this.cursor.line = op.line;
        this.cursor.col = op.col;
        this.insertText(op.text, false);
        this.undoStack.push(op);
      } else if (op.type === "delete") {
        this.deleteRange(op.line, op.col, op.text, false);
        this.undoStack.push(op);
      }
      this.notifyChange();
    }

    scrollByLines(count) {
      if (!this.scrollEl) return;
      this.scrollEl.scrollTop += count * this.lineHeight;
    }
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

  function attachCustomScrollbar(el) {
    if (!el || customScrollbars.has(el)) return;
    const track = document.createElement("div");
    track.className = "lp-scrollbar";
    track.setAttribute("contenteditable", "false");
    const thumb = document.createElement("div");
    thumb.className = "lp-scrollbar-thumb";
    thumb.setAttribute("contenteditable", "false");
    track.appendChild(thumb);
    el.appendChild(track);

    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;
    let scheduled = false;

    const update = () => {
      const height = el.clientHeight;
      const scrollHeight = el.scrollHeight;
      const maxScroll = scrollHeight - height;
      if (scrollHeight <= height + 1) {
        track.style.display = "none";
        return;
      }
      track.style.display = "block";
      const thumbHeight = Math.max((height / scrollHeight) * (height - 12), 24);
      const maxThumbTop = height - thumbHeight - 12;
      const top = maxScroll > 0 ? (el.scrollTop / maxScroll) * maxThumbTop : 0;
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translateY(${top}px)`;
    };

    const scheduleUpdate = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        update();
      });
    };

    const onScroll = () => {
      el.classList.add("is-scrolling");
      scheduleUpdate();
      clearTimeout(onScroll._timer);
      onScroll._timer = setTimeout(() => {
        el.classList.remove("is-scrolling");
      }, 600);
    };

    const onDragMove = (event) => {
      if (!isDragging) return;
      const height = el.clientHeight;
      const scrollHeight = el.scrollHeight;
      const maxScroll = scrollHeight - height;
      const trackHeight = height - 12;
      const thumbHeight = Math.max((height / scrollHeight) * trackHeight, 24);
      const maxThumbTop = trackHeight - thumbHeight;
      const delta = event.clientY - startY;
      const nextThumbTop = Math.min(Math.max(0, (startScrollTop / maxScroll) * maxThumbTop + delta), maxThumbTop);
      const nextScrollTop = maxScroll > 0 ? (nextThumbTop / maxThumbTop) * maxScroll : 0;
      el.scrollTop = nextScrollTop;
    };

    const onDragEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      document.removeEventListener("mousemove", onDragMove);
      document.removeEventListener("mouseup", onDragEnd);
    };

    thumb.addEventListener("mousedown", (event) => {
      event.preventDefault();
      isDragging = true;
      startY = event.clientY;
      startScrollTop = el.scrollTop;
      document.addEventListener("mousemove", onDragMove);
      document.addEventListener("mouseup", onDragEnd);
    });
    track.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });

    el.addEventListener("scroll", onScroll);
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(el);
    const mutationObserver = new MutationObserver(scheduleUpdate);
    mutationObserver.observe(el, { childList: true, characterData: true, subtree: true });
    update();
    customScrollbars.set(el, { track, thumb, update, observer, mutationObserver });
  }

  function initCustomScrollbars() {
    const elements = document.querySelectorAll(".custom-scroll");
    elements.forEach((el) => attachCustomScrollbar(el));
  }

  async function saveToFile(forceSaveAs) {
    if (!api) return;
    const tab = tabs.get(activeTabId);
    if (!tab) return;
    let formatChoice = null;
    const isPlain = isPlainMode && plainEditorInstance;
    const currentPath = tab.filePath || "";
    const currentExt = currentPath ? currentPath.split(".").pop().toLowerCase() : "";
    const defaultFormat = "txt";
    if (!isPlain && hasRichFormatting(tab.contentHtml) && (forceSaveAs || !currentPath || currentExt !== "md")) {
      formatChoice = await openFormatDialog();
      if (!formatChoice || formatChoice === "cancel") {
        return false;
      }
    }
    lastSavedPath = tab.filePath || "";
    const action = forceSaveAs ? "file:saveAs" : "file:save";
    const suggestedName = getSuggestedFileName(tab, formatChoice || (isPlain ? "txt" : defaultFormat));
    const ext = lastSavedPath ? lastSavedPath.split(".").pop().toLowerCase() : "";
    const effectiveFormat = isPlain
      ? "txt"
      : (formatChoice || (ext === "md" ? ext : defaultFormat));
    const shouldSaveMarkdown = !isPlain && effectiveFormat === "md";
    const contentToSave = isPlain
      ? plainEditorInstance.getText()
      : shouldSaveMarkdown
        ? htmlToMarkdown(getEditorHTML())
        : getEditorText();
    if (!forceSaveAs && confirmOverwriteEnabled && tab.filePath) {
      const choice = await openConfirmOverwriteDialog(tab.filePath);
      if (choice === "cancel") {
        return false;
      }
    }
    let result;
    try {
      result = await api.action(action, {
        content: contentToSave,
        filePath: lastSavedPath,
        suggestedName,
        preferredExt: isPlain
          ? "txt"
          : shouldSaveMarkdown
            ? "md"
            : (effectiveFormat === "txt" ? "txt" : "")
      });
    } catch (error) {
      const message = error?.message ? `Save failed: ${error.message}` : "Save failed";
      showErrorToast(message);
      addActivity({ type: "error", title: message });
      return false;
    }
    if (result?.error) {
      showErrorToast(result.error);
      addActivity({ type: "error", title: result.error });
      return false;
    }
    if (result && !result.canceled) {
      lastSavedPath = result.filePath || "";
      if (lastSavedPath) {
        localStorage.setItem("lp:lastFilePath", lastSavedPath);
      }
      tab.filePath = lastSavedPath || null;
      tab.encoding = "UTF-8";
      setTabTitle(tab, lastSavedPath.split(/[\\/]/).pop());
      setTabDirty(tab, false);
      if (isPlain) {
        tab.contentText = plainEditorInstance.getText();
      } else {
        tab.contentHtml = getEditorHTML();
        tab.contentText = htmlToPlainText(tab.contentHtml);
      }
      persistTabs();
      updateFooterToggles();
      return true;
    }
    return false;
  }

  async function openFile() {
    if (!api) return;
    let result;
    try {
      result = await api.action("file:open");
    } catch (error) {
      const message = error?.message ? `Open failed: ${error.message}` : "Open failed";
      showErrorToast(message);
      addActivity({ type: "error", title: message });
      return;
    }
    if (result?.error) {
      showErrorToast(result.error);
      addActivity({ type: "error", title: result.error });
      return;
    }
    if (result && !result.canceled) {
      applyOpenResult(result);
    }
  }

  async function openFileFromPath(filePath) {
    if (!api || !filePath) return false;
    let result;
    try {
      result = await api.action("file:openPath", { filePath });
    } catch (error) {
      const message = error?.message ? `Open failed: ${error.message}` : "Open failed";
      showErrorToast(message);
      addActivity({ type: "error", title: message });
      return false;
    }
    if (result?.error) {
      showErrorToast(result.error);
      addActivity({ type: "error", title: result.error });
      return false;
    }
    if (result && !result.canceled) {
      applyOpenResult(result);
      return true;
    }
    return false;
  }

  function applyOpenResult(result) {
    const tab = tabs.get(activeTabId);
    if (!tab) return;
    const filePath = result.filePath || "";
    const ext = filePath ? filePath.split(".").pop().toLowerCase() : "";
    const content = result.content || "";
    if (isPlainMode && plainEditorInstance) {
      plainEditorInstance.setText(content);
      tab.contentText = content;
      tab.contentHtml = getEditorHTML();
      scheduleStatusUpdate();
    } else if (ext === "md") {
      setEditorHTML(renderMarkdown(content));
      tab.contentHtml = getEditorHTML();
      tab.contentText = htmlToPlainText(tab.contentHtml);
    } else {
      setEditorText(content);
      tab.contentHtml = getEditorHTML();
      tab.contentText = content;
    }
    tab.filePath = filePath || null;
    tab.encoding = result.encoding || "UTF-8";
    lastSavedPath = filePath || "";
    if (lastSavedPath) {
      localStorage.setItem("lp:lastFilePath", lastSavedPath);
      setTabTitle(tab, lastSavedPath.split(/[\\/]/).pop());
    }
    setTabDirty(tab, false);
    updateStatus();
    updatePreview();
    updateFooterToggles();
  }

  async function runAction(name) {
    if (!name) return;
    switch (name) {
      case "file:new": {
        const tab = createTab(t("tab.untitled"), "", null);
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
          await closeTab(activeTabId);
        }
        return;
      case "file:trash":
        openTrashModal();
        return;
      case "edit:undo":
        if (isPlainMode && plainEditorInstance) {
          plainEditorInstance.undo();
          return;
        }
        if (api) {
          await api.action(name);
        }
        return;
      case "edit:redo":
        if (isPlainMode && plainEditorInstance) {
          plainEditorInstance.redo();
          return;
        }
        if (api) {
          await api.action(name);
        }
        return;
      case "edit:paste":
        if (isPlainMode && plainEditorInstance) {
          try {
            const text = await navigator.clipboard.readText();
            if (text) {
              plainEditorInstance.insertText(text);
            }
          } catch (_error) {
          }
          return;
        }
        if (api) {
          await api.action(name);
        }
        return;
      case "edit:cut":
      case "edit:copy":
      case "edit:selectAll":
        if (api) {
          await api.action(name);
        }
        return;
      case "view:fullscreen":
        if (api) {
          const result = await api.action(name);
          if (typeof result?.fullScreen === "boolean") {
            isFullScreen = result.fullScreen;
          }
        }
        return;
      case "view:zoomIn":
        setEditorZoom(editorZoom + 0.1);
        return;
      case "view:zoomOut":
        setEditorZoom(editorZoom - 0.1);
        return;
      case "view:zoomReset":
        setEditorZoom(1);
        return;
      case "window:minimize":
      case "window:close":
        if (api) {
          await api.action(name);
        }
        return;
      case "window:toggleMaximize":
        if (api) {
          const result = await api.action(name);
          setWindowMaximizeState(!!result?.maximized);
        }
        return;
      case "app:quit":
        if (api) {
          await api.action(name);
        }
        return;
      case "file:exportPdf":
      case "file:exportTxt":
      case "file:exportHtml":
        if (api) {
          try {
            const result = await api.action(name, {
              defaultFolder: getExportFolder(),
              content: isPlainMode && plainEditorInstance ? plainEditorInstance.getText() : getEditorText()
            });
            if (result?.error) {
              showErrorToast(result.error);
              addActivity({ type: "error", title: result.error });
            }
          } catch (error) {
            const message = error?.message ? `Export failed: ${error.message}` : "Export failed";
            showErrorToast(message);
            addActivity({ type: "error", title: message });
          }
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
      case "help:changelog":
        openChangelogModal();
        loadChangelog();
        return;
      case "help:updates":
        alert("Update checks are not wired yet.");
        return;
      default:
        return;
    }
  }

  function setWindowMaximizeState(isMaximized) {
    if (!windowMaximizeButton) return;
    const label = isMaximized ? "Restore Down" : "Maximize";
    windowMaximizeButton.classList.toggle("is-maximized", !!isMaximized);
    windowMaximizeButton.setAttribute("title", label);
    windowMaximizeButton.setAttribute("aria-label", label);
    const icon = windowMaximizeButton.querySelector("i");
    if (icon) {
      setLucideIcon(icon, isMaximized ? "copy" : "square");
    }
  }

  async function syncWindowControls() {
    if (!api || !windowMaximizeButton) return;
    try {
      const result = await api.action("window:isMaximized");
      setWindowMaximizeState(!!result?.maximized);
    } catch (_error) {
    }
  }

  function openMenu(index, shouldFocusFirst = false) {
    if (index < 0 || index >= menuItems.length) return;
    closeMenus();
    menuOpenIndex = index;
    menuItems[index].classList.add("open");
    if (shouldFocusFirst) {
      const firstItem = menuItems[index].querySelector(".menu-dropdown button");
      firstItem?.focus();
    }
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
      if (menuOpenIndex !== -1) openMenu(next, true);
      return true;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const next = (menuFocusedIndex - 1 + menuItems.length) % menuItems.length;
      focusMenu(next);
      if (menuOpenIndex !== -1) openMenu(next, true);
      return true;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (menuOpenIndex === -1) {
        openMenu(menuFocusedIndex, true);
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
        openMenu(menuFocusedIndex, true);
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

  function closeToolbarDropdowns() {
    if (!toolbar) return;
    toolbar.querySelectorAll(".toolbar-dropdown-group.open").forEach((group) => {
      group.classList.remove("open");
      const trigger = group.querySelector("[data-dropdown-trigger]");
      const menu = group.querySelector("[data-dropdown-menu]");
      trigger?.setAttribute("aria-expanded", "false");
      menu?.setAttribute("aria-hidden", "true");
    });
  }

  function toggleToolbarDropdown(target) {
    if (!toolbar || !target) return;
    const group = target.closest(".toolbar-dropdown-group");
    if (!group) return;
    const isOpen = group.classList.contains("open");
    closeToolbarDropdowns();
    if (!isOpen) {
      group.classList.add("open");
      const menu = group.querySelector("[data-dropdown-menu]");
      target.setAttribute("aria-expanded", "true");
      menu?.setAttribute("aria-hidden", "false");
    }
  }

  toolbar?.addEventListener("mousedown", (event) => {
    if (event.target.closest("[data-dropdown-trigger]")) return;
    event.preventDefault();
    saveSelection();
  });
  toolbar?.addEventListener("pointerdown", (event) => {
    if (event.target.closest("[data-dropdown-trigger]")) return;
    event.preventDefault();
    saveSelection();
  });
  toolbar?.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-dropdown-trigger]");
    if (trigger) {
      event.stopPropagation();
      toggleToolbarDropdown(trigger);
      return;
    }
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const action = actionButton.dataset.action;
      if (!action) return;
      handleToolbarAction(action);
      closeToolbarDropdowns();
    }
  });
  document.addEventListener("click", (event) => {
    if (!toolbar || toolbar.contains(event.target)) return;
    closeToolbarDropdowns();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeToolbarDropdowns();
    }
  });

  bubbleButtons.forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const action = button.dataset.action;
      if (!action) return;
      handleToolbarAction(action);
    });
  });
  colorInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!tiptapEditor) return;
      const type = input.dataset.colorInput;
      const color = input.value || "";
      if (!type || !color) return;
      if (type === "text") {
        exec("textColor", color);
      } else {
        exec("highlightColor", color);
      }
      const dot = colorDots.find((el) => el.dataset.colorDot === type);
      if (dot) {
        dot.style.background = color;
      }
    });
  });

  toolbar?.addEventListener("mousedown", (event) => {
    event.preventDefault();
    saveSelection();
  });
  toolbar?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    saveSelection();
  });

  headingSelector?.addEventListener("click", (event) => {
    event.stopPropagation();
    saveSelection();
    togglePopover(headingPopover, headingSelector);
  });

  listSelector?.addEventListener("click", (event) => {
    event.stopPropagation();
    saveSelection();
    togglePopover(listPopover, listSelector);
  });

  headingSelector?.addEventListener("mousedown", (event) => {
    event.preventDefault();
    saveSelection();
  });

  listSelector?.addEventListener("mousedown", (event) => {
    event.preventDefault();
    saveSelection();
  });

  appLogo?.addEventListener("click", () => {
    openWhatsNewTab(true);
  });

  let isResizingPanel = false;
  let resizeStartX = 0;
  let resizeStartWidth = 0;
  outlineResizer?.addEventListener("mousedown", (event) => {
    if (!outlinePanel) return;
    isResizingPanel = true;
    resizeStartX = event.clientX;
    resizeStartWidth = parseInt(getComputedStyle(outlinePanel).width, 10);
    document.body.style.cursor = "col-resize";
    event.preventDefault();
  });
  document.addEventListener("mousemove", (event) => {
    if (!isResizingPanel) return;
    const delta = resizeStartX - event.clientX;
    setSidePanelWidth(resizeStartWidth + delta);
  });
  document.addEventListener("mouseup", () => {
    if (!isResizingPanel) return;
    isResizingPanel = false;
    document.body.style.cursor = "";
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

  listPopover?.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  listPopover?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    restoreSelection();
    editor.focus();
    handleToolbarAction(action);
    closePopover(listPopover);
  });

  document.addEventListener("click", (event) => {
    if (!headingPopover?.contains(event.target) && !headingSelector?.contains(event.target)) {
      closePopover(headingPopover);
    }
    if (!listPopover?.contains(event.target) && !listSelector?.contains(event.target)) {
      closePopover(listPopover);
    }
    if (!menubar.contains(event.target)) {
      closeMenus();
    }
    if (commandPalette?.classList.contains("open") && !commandPalette.contains(event.target)) {
      closeCommandPalette();
    }
    if (activityPanel?.classList.contains("open")) {
      const clickedPanel = event.target.closest("#activity-panel");
      const clickedBell = event.target.closest("[data-activity-bell]");
      if (!clickedPanel && !clickedBell) {
        closeActivityPanel();
      }
    }
    if (spellMenu?.classList.contains("open")) {
      const clickedSpell = event.target.closest("#spell-menu");
      if (!clickedSpell) {
        closeSpellMenu();
      }
    }
    if (settingsDropdowns.length) {
      const clickedDropdown = event.target.closest(".settings-dropdown");
      if (!clickedDropdown) {
        closeSettingsDropdowns();
      }
    }
  });


  document.addEventListener("keydown", (event) => {
    if (handlePopoverKeydown(event, headingPopover)) return;
    if (handlePopoverKeydown(event, listPopover)) return;
    if (event.key === "Escape") {
      closePopover(headingPopover);
      closePopover(listPopover);
      closeCommandPalette();
      toggleFindWidget(false);
      closeSettingsModal();
      closeSettingsPage();
      closeSettingsDropdowns();
      closeSpellMenu();
      closeAboutModal();
      closeWelcomeModal();
      closeTour();
      closeChangelogModal();
      closeActivityPanel();
      closeSaveDialog("cancel");
      closeFormatDialog("cancel");
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
  viewModeExitBtn?.addEventListener("click", () => {
    if (isZenMode) {
      toggleZenMode();
    }
  });
  btnSettings?.addEventListener("click", () => {
    openSettingsPage();
  });
  settingsBack?.addEventListener("click", () => {
    closeSettingsPage();
  });

  spellMenu?.addEventListener("click", async (event) => {
    const target = event.target.closest(".spell-item");
    if (!target || target.classList.contains("disabled")) return;
    const action = target.dataset.action;
    if (!api) return;
    if (action === "replace") {
      await api.action("spell:replace", { suggestion: target.dataset.value });
      closeSpellMenu();
    }
    if (action === "add") {
      await api.action("spell:add", { word: target.dataset.value });
      closeSpellMenu();
    }
  });

  if (settingsPage) {
    const pageToggles = Array.from(settingsPage.querySelectorAll('.switch input[type="checkbox"]'));
    pageToggles.forEach((input) => {
      input.setAttribute("aria-checked", input.checked ? "true" : "false");
      input.addEventListener("change", () => {
        input.setAttribute("aria-checked", input.checked ? "true" : "false");
      });
    });
  }

  if (settingsAutoSaveToggle) {
    settingsAutoSaveToggle.checked = autosaveEnabled;
    settingsAutoSaveToggle.setAttribute("aria-checked", autosaveEnabled ? "true" : "false");
    settingsAutoSaveToggle.addEventListener("change", () => {
      setAutosave(settingsAutoSaveToggle.checked);
    });
  }

  if (settingsWordWrapToggle) {
    settingsWordWrapToggle.checked = isWrap;
    settingsWordWrapToggle.setAttribute("aria-checked", isWrap ? "true" : "false");
    settingsWordWrapToggle.addEventListener("change", () => {
      setWordWrap(settingsWordWrapToggle.checked);
      localStorage.setItem("lp:wordWrap", isWrap ? "1" : "0");
    });
  }

  if (settingsLineHighlightToggle) {
    settingsLineHighlightToggle.checked = isLineHighlightEnabled;
    settingsLineHighlightToggle.setAttribute("aria-checked", isLineHighlightEnabled ? "true" : "false");
    settingsLineHighlightToggle.addEventListener("change", () => {
      isLineHighlightEnabled = settingsLineHighlightToggle.checked;
      localStorage.setItem("lp:lineHighlight", isLineHighlightEnabled ? "1" : "0");
      scheduleLineHighlight();
    });
  }

  if (settingsAccentChips.length) {
    settingsAccentChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const accent = chip.dataset.accent;
        if (accent) {
          setAccentColor(accent);
        }
      });
    });
  }

  if (settingsReduceMotionToggle) {
    const storedReduce = localStorage.getItem("lp:reduceMotion");
    const enabled = storedReduce === "1";
    settingsReduceMotionToggle.checked = enabled;
    settingsReduceMotionToggle.setAttribute("aria-checked", enabled ? "true" : "false");
    document.body.classList.toggle("reduce-motion", enabled);
    settingsReduceMotionToggle.addEventListener("change", () => {
      const next = settingsReduceMotionToggle.checked;
      localStorage.setItem("lp:reduceMotion", next ? "1" : "0");
      settingsReduceMotionToggle.setAttribute("aria-checked", next ? "true" : "false");
      document.body.classList.toggle("reduce-motion", next);
    });
  }

  if (settingsAdaptiveVibeToggle) {
    const storedAdaptive = localStorage.getItem("lp:adaptiveVibe");
    setAdaptiveVibeEnabled(storedAdaptive === "1", { persist: false });
    settingsAdaptiveVibeToggle.addEventListener("change", () => {
      setAdaptiveVibeEnabled(settingsAdaptiveVibeToggle.checked);
    });
  }
  settingsAdaptiveAccentButton?.addEventListener("click", () => {
    if (!adaptiveSuggestedAccentHex) return;
    const applied = setCustomAccentColorFromHex(adaptiveSuggestedAccentHex);
    if (applied) {
      showNotification(t("settings.adaptiveAccentUse"));
    }
  });
  updateAdaptiveAccentSuggestionUI();

  if (settingsConfirmOverwriteToggle) {
    settingsConfirmOverwriteToggle.checked = confirmOverwriteEnabled;
    settingsConfirmOverwriteToggle.setAttribute("aria-checked", confirmOverwriteEnabled ? "true" : "false");
    settingsConfirmOverwriteToggle.addEventListener("change", () => {
      confirmOverwriteEnabled = settingsConfirmOverwriteToggle.checked;
      localStorage.setItem("lp:confirmOverwrite", confirmOverwriteEnabled ? "1" : "0");
      settingsConfirmOverwriteToggle.setAttribute("aria-checked", confirmOverwriteEnabled ? "true" : "false");
    });
  }

  if (settingsUpdateNotificationsToggle) {
    settingsUpdateNotificationsToggle.checked = updateNotificationsEnabled;
    settingsUpdateNotificationsToggle.setAttribute("aria-checked", updateNotificationsEnabled ? "true" : "false");
    settingsUpdateNotificationsToggle.addEventListener("change", () => {
      updateNotificationsEnabled = settingsUpdateNotificationsToggle.checked;
      localStorage.setItem("lp:updateNotifications", updateNotificationsEnabled ? "1" : "0");
      settingsUpdateNotificationsToggle.setAttribute("aria-checked", updateNotificationsEnabled ? "true" : "false");
    });
  }

  if (settingsErrorToastsToggle) {
    const storedErrorToasts = localStorage.getItem("lp:errorToasts");
    errorToastsEnabled = storedErrorToasts !== "0";
    settingsErrorToastsToggle.checked = errorToastsEnabled;
    settingsErrorToastsToggle.setAttribute("aria-checked", errorToastsEnabled ? "true" : "false");
    settingsErrorToastsToggle.addEventListener("change", () => {
      errorToastsEnabled = settingsErrorToastsToggle.checked;
      localStorage.setItem("lp:errorToasts", errorToastsEnabled ? "1" : "0");
      settingsErrorToastsToggle.setAttribute("aria-checked", errorToastsEnabled ? "true" : "false");
    });
  }
  settingsWelcomeTourButton?.addEventListener("click", () => {
    closeSettingsPage();
    startInteractiveTour();
  });
  settingsResetButton?.addEventListener("click", () => {
    resetAllSettings();
    showNotification(t("toast.settingsReset"));
  });

  if (settingsExportFolderInput) {
    settingsExportFolderInput.value = getExportFolder();
    settingsExportFolderInput.addEventListener("input", () => {
      localStorage.setItem("lp:exportFolder", settingsExportFolderInput.value.trim());
    });
  }

  if (settingsBlurToggle) {
    const storedBlur = localStorage.getItem("lp:blurEffects");
    const enabled = storedBlur !== "0";
    settingsBlurToggle.checked = enabled;
    settingsBlurToggle.setAttribute("aria-checked", enabled ? "true" : "false");
    document.body.classList.toggle("no-blur", !enabled);
    settingsBlurToggle.addEventListener("change", () => {
      const next = settingsBlurToggle.checked;
      localStorage.setItem("lp:blurEffects", next ? "1" : "0");
      settingsBlurToggle.setAttribute("aria-checked", next ? "true" : "false");
      document.body.classList.toggle("no-blur", !next);
    });
  }

  settingsBackgroundPickButton?.addEventListener("click", async () => {
    await pickBackgroundImage();
  });
  settingsBackgroundExampleButton?.addEventListener("click", () => {
    applyExampleBackground();
  });
  settingsBackgroundClearButton?.addEventListener("click", () => {
    clearBackgroundImage();
  });
  settingsBackgroundDimRange?.addEventListener("input", () => {
    setBackgroundDim(settingsBackgroundDimRange.value);
  });
  settingsBackgroundBlurRange?.addEventListener("input", () => {
    setBackgroundBlur(settingsBackgroundBlurRange.value);
  });
  appBackgroundVideo?.addEventListener("loadeddata", () => {
    refreshAdaptiveVibeFromCurrentMedia();
  });
  appBackgroundVideo?.addEventListener("play", () => {
    refreshAdaptiveVibeFromCurrentMedia();
  });
  updateBackgroundControlState();

  if (settingsPlainModeToggle) {
    const storedPlain = localStorage.getItem("lp:plainMode");
    const enabled = storedPlain === "1";
    settingsPlainModeToggle.checked = enabled;
    settingsPlainModeToggle.setAttribute("aria-checked", enabled ? "true" : "false");
    settingsPlainModeToggle.addEventListener("change", () => {
      setPlainMode(settingsPlainModeToggle.checked);
    });
  }

  if (settingsSpellcheckToggle) {
    const storedSpellcheck = localStorage.getItem("lp:spellcheck");
    const enabled = storedSpellcheck === "1";
    setSpellcheck(enabled);
    settingsSpellcheckToggle.addEventListener("change", () => {
      setSpellcheck(settingsSpellcheckToggle.checked);
    });
  }

  if (settingsAutoUpdateToggle) {
    const storedAutoUpdate = localStorage.getItem("lp:autoUpdate");
    if (storedAutoUpdate === null) {
      localStorage.setItem("lp:autoUpdate", "1");
      settingsAutoUpdateToggle.checked = true;
    } else {
      settingsAutoUpdateToggle.checked = storedAutoUpdate === "1";
    }
    settingsAutoUpdateToggle.setAttribute(
      "aria-checked",
      settingsAutoUpdateToggle.checked ? "true" : "false"
    );
    settingsAutoUpdateToggle.addEventListener("change", async () => {
      const enabled = settingsAutoUpdateToggle.checked;
      localStorage.setItem("lp:autoUpdate", enabled ? "1" : "0");
      settingsAutoUpdateToggle.setAttribute("aria-checked", enabled ? "true" : "false");
      if (enabled && api) {
        await api.action("update:check");
      }
    });
  }

  if (settingsStartupToggle) {
    settingsStartupToggle.setAttribute(
      "aria-checked",
      settingsStartupToggle.checked ? "true" : "false"
    );
    if (api) {
      api.action("app:startup:get").then((result) => {
        if (typeof result?.enabled === "boolean") {
          settingsStartupToggle.checked = result.enabled;
          settingsStartupToggle.setAttribute("aria-checked", result.enabled ? "true" : "false");
        }
      });
    }
    settingsStartupToggle.addEventListener("change", async () => {
      const enabled = settingsStartupToggle.checked;
      settingsStartupToggle.setAttribute("aria-checked", enabled ? "true" : "false");
      if (api) {
        const result = await api.action("app:startup:set", { enabled });
        if (typeof result?.enabled === "boolean") {
          settingsStartupToggle.checked = result.enabled;
          settingsStartupToggle.setAttribute("aria-checked", result.enabled ? "true" : "false");
        }
      }
    });
  }

  if (settingsDropdowns.length) {
    suppressSettingsDropdownAction = true;
    settingsDropdowns.forEach((dropdown) => {
      const trigger = dropdown.querySelector(".dropdown-trigger");
      const label = trigger?.querySelector("span");
      const items = Array.from(dropdown.querySelectorAll(".dropdown-item"));
      const setActive = (item) => {
        if (!item || !label) return;
        items.forEach((node) => node.classList.toggle("active", node === item));
        label.textContent = item.textContent.trim();
        const value = item.dataset.value || item.textContent.trim();
        dropdown.dataset.value = value;
        if (!suppressSettingsDropdownAction && dropdown.dataset.setting === "autosave-interval") {
          setAutosaveInterval(parseAutosaveInterval(value));
        }
        if (!suppressSettingsDropdownAction && dropdown.dataset.setting === "font-size") {
          setFontSizePreset(value);
        }
        if (!suppressSettingsDropdownAction && dropdown.dataset.setting === "language") {
          applyLanguage(normalizeLanguage(value));
        }
      };
      if (dropdown.dataset.setting === "autosave-interval") {
        dropdown.dataset.value = getAutosaveIntervalLabel(autosaveIntervalMs);
      }
      if (dropdown.dataset.setting === "font-size") {
        dropdown.dataset.value = localStorage.getItem("lp:fontSize") || "Default";
      }
      if (dropdown.dataset.setting === "language") {
        dropdown.dataset.value = normalizeLanguage(localStorage.getItem("lp:language"));
      }
      const initialValue = dropdown.dataset.value;
      if (initialValue) {
        const initialItem = items.find((item) => item.dataset.value === initialValue);
        if (initialItem) {
          setActive(initialItem);
        }
      } else if (items[0]) {
        setActive(items[0]);
      }
      trigger?.addEventListener("click", (event) => {
        event.stopPropagation();
        const isOpen = dropdown.classList.contains("open");
        closeSettingsDropdowns();
        if (!isOpen) {
          dropdown.classList.add("open");
        }
      });
      items.forEach((item) => {
        item.addEventListener("click", (event) => {
          event.stopPropagation();
          setActive(item);
          dropdown.classList.remove("open");
        });
      });
    });
    suppressSettingsDropdownAction = false;
  }

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
  onboardLangOptions.forEach((button) => {
    button.addEventListener("click", () => {
      const lang = button.dataset.onboardLanguage;
      if (lang) {
        applyLanguage(normalizeLanguage(lang));
      }
      syncOnboardLanguageOptions();
    });
  });
  onboardAccentOptions.forEach((button) => {
    button.addEventListener("click", () => {
      const accent = button.dataset.onboardAccent;
      if (accent) {
        setAccentColor(accent);
      }
      syncOnboardAccentOptions();
    });
  });
  onboardButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.onboardAction;
      if (action === "back") {
        setOnboardStep("language");
        return;
      }
      if (action === "next") {
        if (onboardStep === "language") {
          setOnboardStep("accent");
          return;
        }
        const version = await getAppVersion();
        localStorage.setItem("lp:onboardSeen", version || "1");
        closeOnboardModal();
        await showWelcomeTipsIfNeeded();
      }
    });
  });
  welcomeModal?.addEventListener("click", (event) => {
    if (event.target === welcomeModal) {
      closeWelcomeModal();
    }
  });
  aboutClose?.addEventListener("click", () => closeAboutModal());
  aboutUpdates?.addEventListener("click", async () => {
    if (!api) return;
    await api.action("update:check");
    showNotification(t("toast.checkingUpdates"));
  });
  welcomeButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.welcomeAction;
      if (action === "close") {
        const version = await getAppVersion();
        localStorage.setItem("lp:welcomeTipsSeen", version || "1");
        closeWelcomeModal();
      }
      if (action === "tour") {
        const version = await getAppVersion();
        localStorage.setItem("lp:welcomeTipsSeen", version || "1");
        closeWelcomeModal();
        startInteractiveTour();
      }
    });
  });
  tourButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.tourAction;
      if (action === "skip") {
        closeTour();
        return;
      }
      if (action === "prev") {
        if (tourHistory.length) {
          openTourAt(tourHistory.pop());
        } else {
          openTourAt(0);
        }
        return;
      }
      if (action === "next") {
        const nextIndex = findNextTourIndex(tourIndex, 1);
        if (nextIndex === -1) {
          closeTour();
          return;
        }
        tourHistory.push(tourIndex);
        openTourAt(nextIndex);
      }
    });
  });
  tourOverlay?.addEventListener("click", (event) => {
    if (event.target === tourOverlay) {
      closeTour();
    }
  });
  window.addEventListener("resize", () => {
    if (tourIndex >= 0) {
      positionTour();
    }
  });
  document.addEventListener("scroll", () => {
    if (tourIndex >= 0) {
      positionTour();
    }
  }, true);
  saveModal?.addEventListener("click", (event) => {
    if (event.target === saveModal) {
      closeSaveDialog("cancel");
    }
  });
  formatModal?.addEventListener("click", (event) => {
    if (event.target === formatModal) {
      closeFormatDialog("cancel");
    }
  });
  saveButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.saveAction;
      if (action === "save") {
        closeSaveDialog("save");
      } else if (action === "dont-save") {
        closeSaveDialog("dont-save");
      } else {
        closeSaveDialog("cancel");
      }
    });
  });
  formatButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.formatAction;
      closeFormatDialog(action);
    });
  });
  missingFileButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.missingAction;
      if (action === "ok") {
        const tabId = missingFileTabId;
        closeMissingFileDialog();
        if (tabId) {
          closeTab(tabId);
        }
      }
    });
  });
  trashButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.trashAction;
      if (action === "close") {
        closeTrashModal();
      }
      if (action === "clear") {
        trashItems = [];
        saveTrash();
        renderTrash();
      }
    });
  });
  trashList?.addEventListener("click", async (event) => {
    const actionBtn = event.target.closest("[data-trash-action]");
    if (!actionBtn) return;
    const action = actionBtn.dataset.trashAction;
    const id = actionBtn.dataset.trashId;
    if (!id) return;
    if (action === "restore") {
      const entryIndex = trashItems.findIndex((item) => item.id === id);
      if (entryIndex === -1) return;
      const entry = trashItems.splice(entryIndex, 1)[0];
      if (entry.filePath && api) {
        try {
          const exists = await api.action("file:exists", { filePath: entry.filePath });
          if (!exists?.exists) {
            trashItems.splice(entryIndex, 0, entry);
            saveTrash();
            renderTrash();
            const message = `Cannot restore. File not found: ${entry.filePath}`;
            showErrorToast(message);
            addActivity({ type: "error", title: message });
            return;
          }
        } catch (error) {
          trashItems.splice(entryIndex, 0, entry);
          saveTrash();
          renderTrash();
          const message = error?.message
            ? t("toast.restoreFailedWithReason").replace("{error}", error.message)
            : t("toast.restoreFailed");
          showErrorToast(message);
          addActivity({ type: "error", title: message });
          return;
        }
      }
      saveTrash();
      const restoredText = typeof entry.contentText === "string" ? entry.contentText : "";
      const restoredHtml = entry.contentHtml && entry.contentHtml.trim().length
        ? entry.contentHtml
        : plainTextToHtml(restoredText);
      const tab = createTab(entry.title, restoredHtml, entry.filePath, {
        encoding: entry.encoding || "UTF-8",
        contentText: restoredText
      });
      setActiveTab(tab.id);
      setTabDirty(tab, false);
      renderTrash();
    }
    if (action === "delete") {
      trashItems = trashItems.filter((item) => item.id !== id);
      saveTrash();
      renderTrash();
    }
  });
  activityPanel?.addEventListener("click", (event) => {
    if (event.target === activityPanel) {
      closeActivityPanel();
      return;
    }
    const actionBtn = event.target.closest("[data-activity-action]");
    if (!actionBtn) return;
    const id = actionBtn.dataset.activityId;
    const actionId = actionBtn.dataset.activityAction;
    const item = activities.find((entry) => entry.id === id);
    if (!item) return;
    const action = item.actions?.find((entry) => entry.id === actionId);
    if (action?.handler) {
      action.handler();
    }
  });
  changelogModal?.addEventListener("click", (event) => {
    if (event.target === changelogModal) {
      closeChangelogModal();
    }
  });
  changelogButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.changelogAction;
      if (action === "close") {
        closeChangelogModal();
      }
      if (action === "copy" && activeChangelogVersion) {
        const entry = changelogData[activeChangelogVersion] || {};
        const text = getChangelogPlainText(activeChangelogVersion, entry);
        await navigator.clipboard.writeText(text);
        showNotification(t("toast.changelogCopied"));
      }
    });
  });
  changelogSearch?.addEventListener("input", () => {
    renderChangelogList(changelogSearch.value);
  });

  downloadButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.downloadAction;
      if (!action || !api || !activeDownloadId) return;
      if (action === "pause") {
        if (downloadMode !== "file") return;
        if (downloadPaused) {
          await api.action("download:resume", { id: activeDownloadId });
          downloadPaused = false;
        } else {
          await api.action("download:pause", { id: activeDownloadId });
          downloadPaused = true;
        }
        updateDownloadButtons();
      }
      if (action === "cancel") {
        if (downloadStage === "ready") {
          closeDownloadOverlay();
        } else {
          if (downloadMode === "file") {
            await api.action("download:cancel", { id: activeDownloadId });
          }
          closeDownloadOverlay();
        }
      }
      if (action === "open" && activeDownloadPath) {
        if (downloadMode === "file") {
          await api.action("download:openFolder", { filePath: activeDownloadPath });
        }
      }
    });
  });

  api?.onDownloadStarted?.((payload) => {
    activeDownloadId = payload.id;
    activeDownloadPath = "";
    downloadPaused = false;
    downloadMode = "file";
    setDownloadStage("downloading");
    const ext = getFileExtension(payload.filename || "");
    if (downloadBadge) {
      downloadBadge.textContent = getFileBadge(ext);
    }
    if (downloadIcon) {
      setLucideIcon(downloadIcon, getFileIconName(ext));
    }
    if (downloadFilename) {
      downloadFilename.textContent = payload.filename || "Download";
    }
    if (downloadBar) {
      downloadBar.style.width = "0%";
    }
    if (downloadPercent) {
      downloadPercent.textContent = "0%";
    }
    if (downloadStats) {
      downloadStats.textContent = `0% - 0/${formatBytes(payload.totalBytes || 0)}`;
    }
    if (downloadSpeed) {
      downloadSpeed.textContent = "0 KB/s - ETA --:--";
    }
    updateDownloadButtons();
    openDownloadOverlay();
  });

  api?.onDownloadProgress?.((payload) => {
    if (!payload || payload.id !== activeDownloadId) return;
    const percent = Math.round((payload.progress || 0) * 100);
    if (downloadBar) {
      downloadBar.style.width = `${percent}%`;
    }
    if (downloadPercent) {
      downloadPercent.textContent = `${percent}%`;
    }
    if (downloadStats) {
      downloadStats.textContent = `${percent}% - ${formatBytes(payload.receivedBytes || 0)}/${formatBytes(payload.totalBytes || 0)}`;
    }
    const speed = payload.speed || 0;
    const eta = speed > 0 ? (payload.totalBytes - payload.receivedBytes) / speed : 0;
    if (downloadSpeed) {
      downloadSpeed.textContent = `${formatBytes(speed)}/s - ETA ${formatEta(eta)}`;
    }
  });

  api?.onDownloadDone?.((payload) => {
    if (!payload || payload.id !== activeDownloadId) return;
    activeDownloadPath = payload.filePath || "";
    setDownloadStage("verifying");
    if (downloadStats) {
      downloadStats.textContent = "Verifying download...";
    }
    if (downloadSpeed) {
      downloadSpeed.textContent = "Please wait";
    }
    setTimeout(() => {
      setDownloadStage("ready");
      if (downloadStats) {
        downloadStats.textContent = "Ready to open";
      }
      if (downloadSpeed) {
        downloadSpeed.textContent = t("toast.downloadComplete");
      }
      if (downloadBar) {
        downloadBar.style.width = "100%";
      }
      if (downloadPercent) {
        downloadPercent.textContent = "100%";
      }
      if (downloadMode === "file") {
        addActivity({
          type: "download",
          title: downloadFilename?.textContent
            ? `${t("toast.downloadComplete")} - ${downloadFilename.textContent}`
            : t("toast.downloadComplete"),
          actions: activeDownloadPath ? [
            {
              label: t("toast.openFile"),
              handler: async () => {
                if (api) {
                  await api.action("download:openFile", { filePath: activeDownloadPath });
                }
              }
            },
            {
              label: t("toast.showInFolder"),
              handler: async () => {
                if (api) {
                  await api.action("download:openFolder", { filePath: activeDownloadPath });
                }
              }
            }
          ] : []
        });
        showDownloadToast(activeDownloadPath);
      }
    }, 700);
  });

  api?.onDownloadError?.((payload) => {
    if (!payload || payload.id !== activeDownloadId) return;
    setDownloadStage("downloading");
    addActivity({
      type: "error",
      title: payload.message || t("toast.downloadFailed")
    });
    showErrorToast(payload.message || t("toast.downloadFailed"));
    if (downloadStats) {
      downloadStats.textContent = payload.message || t("toast.downloadFailed");
    }
    if (downloadSpeed) {
      downloadSpeed.textContent = "Stopped";
    }
  });

  updateButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.updateAction;
      if (!action || !api) return;
      if (action === "later") {
        if (pendingUpdateVersion) {
          localStorage.setItem("lp:skippedUpdateVersion", pendingUpdateVersion);
        }
        closeUpdateModal();
        return;
      }
      if (action === "now") {
        localStorage.removeItem("lp:skippedUpdateVersion");
        closeUpdateModal();
        downloadMode = "update";
        activeDownloadId = "update";
        activeDownloadPath = "";
        downloadPaused = false;
        setDownloadStage("downloading");
        if (downloadBadge) {
          downloadBadge.textContent = "UPDATE";
        }
        if (downloadIcon) {
          setLucideIcon(downloadIcon, "cloud-download");
        }
        if (downloadFilename) {
          downloadFilename.textContent = "LucidPad Update";
        }
        if (downloadBar) {
          downloadBar.style.width = "0%";
        }
        if (downloadPercent) {
          downloadPercent.textContent = "0%";
        }
        if (downloadStats) {
          downloadStats.textContent = "0% - 0/0";
        }
        if (downloadSpeed) {
          downloadSpeed.textContent = "0 KB/s - ETA --:--";
        }
        updateDownloadButtons();
        openDownloadOverlay();
        await api.action("update:download");
      }
    });
  });

  api?.onUpdateAvailable?.((payload) => {
    const version = payload?.version || "";
    const skipped = localStorage.getItem("lp:skippedUpdateVersion");
    if (version && skipped === version) {
      return;
    }
    if (!updateNotificationsEnabled) {
      return;
    }
    addActivity({
      type: "update",
      title: version ? `Update available (v${version})` : "Update available",
      actions: [
        {
          label: "Update now",
          handler: () => openUpdateModal(version)
        }
      ]
    });
    openUpdateModal(version);
  });

  api?.onUpdateProgress?.((payload) => {
    if (downloadMode !== "update") return;
    const percent = Math.round((payload.progress || 0) * 100);
    if (downloadBar) {
      downloadBar.style.width = `${percent}%`;
    }
    if (downloadPercent) {
      downloadPercent.textContent = `${percent}%`;
    }
    if (downloadStats) {
      downloadStats.textContent = `${percent}% - ${formatBytes(payload.receivedBytes || 0)}/${formatBytes(payload.totalBytes || 0)}`;
    }
    const speed = payload.speed || 0;
    const eta = speed > 0 ? (payload.totalBytes - payload.receivedBytes) / speed : 0;
    if (downloadSpeed) {
      downloadSpeed.textContent = `${formatBytes(speed)}/s - ETA ${formatEta(eta)}`;
    }
  });

  api?.onUpdateDownloaded?.(() => {
    if (downloadMode !== "update") return;
    if (updateNotificationsEnabled) {
      addActivity({
        type: "update",
        title: "Update downloaded",
        actions: [
          {
            label: "Restart now",
            handler: async () => {
              if (api) {
                await api.action("update:install");
              }
            }
          }
        ]
      });
    }
    setDownloadStage("verifying");
    if (downloadStats) {
      downloadStats.textContent = "Verifying update...";
    }
    if (downloadSpeed) {
      downloadSpeed.textContent = "Please wait";
    }
    setTimeout(async () => {
      setDownloadStage("ready");
      if (downloadStats) {
        downloadStats.textContent = "Ready to restart";
      }
      if (downloadSpeed) {
        downloadSpeed.textContent = "Update downloaded";
      }
      if (downloadBar) {
        downloadBar.style.width = "100%";
      }
      if (downloadPercent) {
        downloadPercent.textContent = "100%";
      }
      if (updateNotificationsEnabled) {
        showNotification(t("toast.updateReadyRestart"));
      }
      await api.action("update:install");
    }, 700);
  });

  api?.onUpdateError?.((payload) => {
    if (downloadMode !== "update") return;
    if (updateNotificationsEnabled) {
      addActivity({
        type: "error",
        title: payload?.message || t("toast.updateFailed")
      });
    }
    showErrorToast(payload?.message || t("toast.updateFailed"));
    if (downloadStats) {
      downloadStats.textContent = payload?.message || t("toast.updateFailed");
    }
    if (downloadSpeed) {
      downloadSpeed.textContent = "Stopped";
    }
  });

  api?.onSpellContext?.((payload) => {
    if (!payload) return;
    openSpellMenu(payload);
  });

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

  tabsArrowLeft?.addEventListener("click", () => {
    tabsContainer?.scrollBy({ left: -220, behavior: "smooth" });
  });
  tabsArrowRight?.addEventListener("click", () => {
    tabsContainer?.scrollBy({ left: 220, behavior: "smooth" });
  });
  tabsContainer?.addEventListener("scroll", () => {
    updateTabScrollUI();
  });
  window.addEventListener("resize", () => {
    clampSidePanelWidth();
    updateTabScrollUI();
  });


  tabsContainer?.addEventListener("click", async (event) => {
    const closeBtn = event.target.closest(".tab-close");
    const tabEl = event.target.closest(".tab");
    if (!tabEl) return;
    const tabId = tabEl.dataset.tabId;
    if (closeBtn && tabId) {
      await closeTab(tabId);
      return;
    }
    if (tabId) {
      setActiveTab(tabId);
    }
  });


  editor?.addEventListener("input", () => {
    if (isPlainMode) return;
    if (!isTipTapActive()) {
      normalizeInlineCaret(window.getSelection());
      saveSelection();
      cleanupInlinePlaceholders();
    }
    const tab = tabs.get(activeTabId);
    if (tab) {
      tab.contentHtml = getEditorHTML();
      tab.contentText = htmlToPlainText(tab.contentHtml);
      setTabDirty(tab, true);
      if (!tab.filePath) {
        setTabTitle(tab, deriveTabTitleFromContent(tab.contentHtml));
      }
    }
    lastEditedAt = Date.now();
    scheduleStatusUpdate();
    schedulePreviewUpdate();
    schedulePersistTabs();
    scheduleCustomCaretUpdate();
    scheduleLineHighlight();
    refreshCaretBlink();
  });


  editor?.addEventListener("keyup", () => {
    if (!isTipTapActive()) {
      saveSelection();
    }
    scheduleStatusUpdate();
    updateToolbarStates();
    schedulePositionToolbar();
    scheduleCustomCaretUpdate();
    scheduleLineHighlight();
  });
  editor?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      setTimeout(() => {
        scheduleCustomCaretUpdate();
        scheduleLineHighlight();
      }, 0);
    }
  });
  editor?.addEventListener("beforeinput", (event) => {
    if (isPlainMode) return;
    if (isTipTapActive()) return;
    if (event.inputType && event.inputType.startsWith("insert")) {
      clearInlinePlaceholderBeforeInput(window.getSelection());
    }
  });
  editor?.addEventListener("mouseup", () => {
    if (!isTipTapActive()) {
      saveSelection();
    }
    scheduleStatusUpdate();
    updateToolbarStates();
    schedulePositionToolbar();
    scheduleCustomCaretUpdate();
    scheduleLineHighlight();
  });
  editorScroll?.addEventListener("scroll", () => {
    if (isSidePanelOpen) {
      highlightOutlineByScroll();
    }
    scheduleCustomCaretUpdate();
    scheduleLineHighlight();
  });
  document.addEventListener("selectionchange", () => {
    updateToolbarStates();
    if (!isTipTapActive()) {
      const range = getActiveEditorRange();
      if (range) {
        savedRange = range.cloneRange();
      }
    }
    schedulePositionToolbar();
    scheduleCustomCaretUpdate();
    scheduleLineHighlight();
  });

  editor?.addEventListener("focus", () => {
    scheduleCustomCaretUpdate();
    refreshCaretBlink();
    scheduleLineHighlight();
  });
  editor?.addEventListener("blur", () => {
    setCustomCaretVisible(false);
  });

  window.addEventListener("resize", schedulePositionToolbar);
  window.addEventListener("focus", () => {
    syncWindowControls();
  });

  menubar?.addEventListener("click", (event) => {
    const windowActionBtn = event.target.closest('.window-controls [data-action]');
    if (windowActionBtn) {
      runAction(windowActionBtn.dataset.action);
      closeMenus();
      return;
    }
    if (settingsPage?.classList.contains("open")) {
      closeMenus();
      return;
    }
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
    if (settingsPage?.classList.contains("open")) {
      return;
    }
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


    const key = event.key.toLowerCase();
    if (event.ctrlKey && key === "b") {
      event.preventDefault();
      if (!notepadMode) applyInlineFormat("bold", "b,strong", "strong");
    }
    if (event.ctrlKey && key === "i") {
      event.preventDefault();
      if (!notepadMode) applyInlineFormat("italic", "i,em", "em");
    }
    if (event.ctrlKey && key === "u") {
      event.preventDefault();
      if (!notepadMode) applyInlineFormat("underline", "u", "u");
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
      setEditorZoom(editorZoom + 0.1);
    }
    if (event.ctrlKey && event.key === "-") {
      event.preventDefault();
      setEditorZoom(editorZoom - 0.1);
    }
    if (event.ctrlKey && event.key === "0") {
      event.preventDefault();
      setEditorZoom(1);
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


  statusAutoSave?.addEventListener("click", () => toggleAutosave());
  if (statusNotify && statusNotify !== activityBell) {
    statusNotify.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleActivityPanel();
    });
  }

  function loadFooterSettings() {
    const savedAutoSave = localStorage.getItem("lp:autoSave");
    const savedAutoSaveInterval = parseInt(localStorage.getItem("lp:autoSaveInterval") || "", 10);
    const savedSpellcheck = localStorage.getItem("lp:spellcheck");
    const savedMarkdown = localStorage.getItem("lp:markdownMode");
    const savedPlain = localStorage.getItem("lp:plainMode");
    const savedFontSize = localStorage.getItem("lp:fontSize");
    const savedZoom = parseFloat(localStorage.getItem("lp:editorZoom") || "");
    const savedLineHighlight = localStorage.getItem("lp:lineHighlight");
    const savedReduceMotion = localStorage.getItem("lp:reduceMotion");
    const savedBlurEffects = localStorage.getItem("lp:blurEffects");
    const savedConfirmOverwrite = localStorage.getItem("lp:confirmOverwrite");
    const savedUpdateNotifications = localStorage.getItem("lp:updateNotifications");
    const savedErrorToasts = localStorage.getItem("lp:errorToasts");
    const savedAdaptiveVibe = localStorage.getItem("lp:adaptiveVibe");
    const savedAdaptiveSuggestedAccent = localStorage.getItem("lp:adaptiveSuggestedAccent") || "";
    const savedLanguage = localStorage.getItem("lp:language");
    const savedWrap = localStorage.getItem("lp:wordWrap");
    const savedAccent = localStorage.getItem("lp:accentColor");
    const savedPanelOpen = localStorage.getItem("lp:sidePanelOpen");
    const savedPanelWidth = parseInt(localStorage.getItem("lp:sidePanelWidth") || "", 10);
    const savedBgImageData = localStorage.getItem("lp:bgImageData") || "";
    const savedBgMediaType = localStorage.getItem("lp:bgMediaType") || "";
    const savedBgVideoPath = localStorage.getItem("lp:bgVideoPath") || "";
    const savedBgDim = parseInt(localStorage.getItem("lp:bgImageDim") || "", 10);
    const savedBgBlur = parseInt(localStorage.getItem("lp:bgImageBlur") || "", 10);
    if (savedAutoSave === "0") {
      autosaveEnabled = false;
    }
    if (!Number.isNaN(savedAutoSaveInterval) && savedAutoSaveInterval > 0) {
      autosaveIntervalMs = savedAutoSaveInterval;
    }
    if (savedMarkdown === "0") {
      markdownMode = false;
    }
    if (savedSpellcheck === "1") {
      setSpellcheck(true);
    } else {
      setSpellcheck(false);
    }
    if (savedLineHighlight === "1") {
      isLineHighlightEnabled = true;
    }
    if (savedConfirmOverwrite === "0") {
      confirmOverwriteEnabled = false;
    }
    if (savedUpdateNotifications === "0") {
      updateNotificationsEnabled = false;
    }
    if (savedErrorToasts === "0") {
      errorToastsEnabled = false;
    }
    if (savedLanguage) {
      currentLanguage = normalizeLanguage(savedLanguage);
    }
    if (/^#[0-9a-fA-F]{6}$/.test(savedAdaptiveSuggestedAccent)) {
      adaptiveSuggestedAccentHex = savedAdaptiveSuggestedAccent.toLowerCase();
    } else {
      adaptiveSuggestedAccentHex = "";
    }
    updateAdaptiveAccentSuggestionUI();
    document.body.classList.toggle("reduce-motion", savedReduceMotion === "1");
    document.body.classList.toggle("no-blur", savedBlurEffects === "0");
    setAdaptiveVibeEnabled(savedAdaptiveVibe === "1", { persist: false });
    releaseBackgroundVideoObjectUrl();
    backgroundImageData = "";
    backgroundMediaType = "";
    backgroundVideoSource = "";
    backgroundVideoPath = "";
    if (savedBgMediaType === "video" && savedBgVideoPath) {
      const restoredVideoUrl = resolveBackgroundVideoSource(savedBgVideoPath);
      if (restoredVideoUrl) {
        backgroundMediaType = "video";
        backgroundVideoPath = savedBgVideoPath;
        backgroundVideoSource = restoredVideoUrl;
      }
    } else if (savedBgImageData) {
      backgroundImageData = savedBgImageData;
      backgroundMediaType = "image";
    }
    backgroundImageDim = normalizeInt(savedBgDim, 20, 85, 55);
    backgroundImageBlur = normalizeInt(savedBgBlur, 0, 20, 0);
    applyBackgroundImage();
    setPlainMode(savedPlain === "1");
    if (savedFontSize) {
      setFontSizePreset(savedFontSize);
    }
    if (Number.isFinite(savedZoom)) {
      editorZoom = savedZoom;
      applyEditorZoom();
    } else {
      captureEditorBaseMetrics();
      applyEditorZoom();
    }
    setTheme("dark");
    if (savedWrap === "0") {
      setWordWrap(false);
    } else {
      setWordWrap(true);
    }
    if (savedAccent) {
      if (savedAccent.startsWith("custom:")) {
        const customHex = `#${savedAccent.slice("custom:".length)}`;
        const applied = setCustomAccentColorFromHex(customHex, { persist: false });
        if (!applied) {
          setAccentColor("blue");
        }
      } else {
        setAccentColor(savedAccent);
      }
    }
    if (!Number.isNaN(savedPanelWidth)) {
      setSidePanelWidth(savedPanelWidth);
    }
    setSidePanelOpen(savedPanelOpen === "1");
    updateFooterToggles();
    if (settingsAutoSaveToggle) {
      settingsAutoSaveToggle.checked = autosaveEnabled;
      settingsAutoSaveToggle.setAttribute("aria-checked", autosaveEnabled ? "true" : "false");
    }
    syncAutosaveIntervalDropdown();
    if (settingsLineHighlightToggle) {
      settingsLineHighlightToggle.checked = isLineHighlightEnabled;
      settingsLineHighlightToggle.setAttribute("aria-checked", isLineHighlightEnabled ? "true" : "false");
    }
    if (settingsConfirmOverwriteToggle) {
      settingsConfirmOverwriteToggle.checked = confirmOverwriteEnabled;
      settingsConfirmOverwriteToggle.setAttribute("aria-checked", confirmOverwriteEnabled ? "true" : "false");
    }
    if (settingsUpdateNotificationsToggle) {
      settingsUpdateNotificationsToggle.checked = updateNotificationsEnabled;
      settingsUpdateNotificationsToggle.setAttribute("aria-checked", updateNotificationsEnabled ? "true" : "false");
    }
    if (settingsErrorToastsToggle) {
      settingsErrorToastsToggle.checked = errorToastsEnabled;
      settingsErrorToastsToggle.setAttribute("aria-checked", errorToastsEnabled ? "true" : "false");
    }
    if (settingsExportFolderInput) {
      settingsExportFolderInput.value = getExportFolder();
    }
    applyLanguage(currentLanguage);
    scheduleLineHighlight();
    if (autosaveEnabled) {
      startAutosave();
    }
    api?.action("view:getFullscreen").then((result) => {
      if (typeof result?.fullScreen === "boolean") {
        isFullScreen = result.fullScreen;
      }
    });
  }

  async function refreshBranchStatus() {
    if (!api || !statusBranch) return;
    const result = await api.action("git:branch", { repoPath: "" });
    const branch = result?.branch?.trim();
    if (branch) {
      statusBranch.innerHTML = `<i data-lucide="git-branch"></i> ${escapeHtml(branch)}`;
      renderLucideIcons(statusBranch);
    }
  }

  function persistTabs() {
    const ordered = Array.from(tabs.values()).sort((a, b) => a.order - b.order);
    const tabEntries = ordered.map((tab) => ({
      title: tab.title,
      contentHtml: tab.contentHtml,
      contentText: tab.contentText || "",
      filePath: tab.filePath,
      isDirty: tab.isDirty,
      order: tab.order,
      encoding: tab.encoding || "UTF-8",
      caretOffset: Number.isFinite(tab.caretOffset) ? tab.caretOffset : null,
      plainCursor: tab.plainCursor || null
    }));
    localStorage.setItem("lp:tabs", JSON.stringify(tabEntries));
    const activeIndex = ordered.findIndex((tab) => tab.id === activeTabId);
    localStorage.setItem("lp:activeTabIndex", String(Math.max(0, activeIndex)));
  }

  async function initializeTabs() {
    tabsContainer.innerHTML = "";
    tabs.clear();
    activeTabId = "";
    const savedTabsRaw = localStorage.getItem("lp:tabs");
    const savedActiveIndex = parseInt(localStorage.getItem("lp:activeTabIndex") || "", 10);
    if (savedTabsRaw) {
      try {
        const savedTabs = JSON.parse(savedTabsRaw);
        if (Array.isArray(savedTabs) && savedTabs.length > 0) {
          savedTabs.forEach((entry) => {
            const filePath = entry.filePath || null;
            const title = filePath ? filePath.split(/[\\/]/).pop() : entry.title || t("tab.untitled");
            const tab = createTab(title, entry.contentHtml || "", filePath, {
              order: Number.isFinite(entry.order) ? entry.order : undefined,
              encoding: entry.encoding || "UTF-8",
              contentText: entry.contentText || ""
            });
            if (Number.isFinite(entry.caretOffset)) {
              tab.caretOffset = entry.caretOffset;
            }
            if (entry.plainCursor) {
              tab.plainCursor = entry.plainCursor;
            }
            tab.isDirty = !!entry.isDirty;
            setTabDirty(tab, tab.isDirty);
          });
          const index = Number.isNaN(savedActiveIndex) ? 0 : Math.min(savedTabs.length - 1, savedActiveIndex);
          const activeId = Array.from(tabs.keys())[index];
          if (activeId) {
            setActiveTab(activeId);
          }
          updateStatus();
          updateTabScrollUI();
          return;
        }
      } catch (_error) {
      }
    }
    const tab = createTab(t("tab.untitled"), "", null);
    setActiveTab(tab.id);
    setEditorHTML("");
    updateStatus();
    updateTabScrollUI();
  }

  function showMissingIfNeeded(tab) {
    if (!tab || !tab.missingPath || tab.missingNotified) return;
    tab.missingNotified = true;
    tab.contentHtml = "";
    tab.isDirty = false;
    setTabDirty(tab, false);
    if (tab.id === activeTabId) {
      setEditorHTML("");
      updateStatus();
      updatePreview();
    }
    openMissingFileDialog(tab.filePath, tab.id);
  }

  async function checkMissingFiles() {
    if (!api) return;
    const checks = Array.from(tabs.values()).map(async (tab) => {
      if (!tab.filePath) return;
      const result = await api.action("file:exists", { filePath: tab.filePath });
      if (!result?.exists) {
        tab.missingPath = true;
      }
    });
    await Promise.all(checks);
    const active = tabs.get(activeTabId);
    showMissingIfNeeded(active);
  }

  async function openWhatsNewTab(forceOpen) {
    const currentVersion = await getAppVersion();
    if (!currentVersion) return;
    const title = `What's New - v${currentVersion}`;
    let existingTab = null;
    tabs.forEach((tab) => {
      if (tab.title === title) {
        existingTab = tab;
      }
    });
    if (existingTab) {
      setActiveTab(existingTab.id);
      return;
    }
    if (!forceOpen) return;
    const releaseData = await loadReleaseData(currentVersion);
    let body = `<h1>${escapeHtml(title)}</h1>`;
    if (releaseData.highlights.length > 0) {
      const items = releaseData.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
      body += `<p>Here's what's new in this release:</p><ol>${items}</ol>`;
    } else if (releaseData.added.length || releaseData.improved.length || releaseData.fixed.length) {
      body += "<p>Here's what's new in this release:</p>";
      if (releaseData.added.length) {
        const items = releaseData.added.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
        body += `<h2>Added</h2><ul>${items}</ul>`;
      }
      if (releaseData.improved.length) {
        const items = releaseData.improved.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
        body += `<h2>Improved</h2><ul>${items}</ul>`;
      }
      if (releaseData.fixed.length) {
        const items = releaseData.fixed.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
        body += `<h2>Fixed</h2><ul>${items}</ul>`;
      }
    } else {
      body += "<p>Welcome to the latest update of LucidPad.</p><p>Release notes are not available for this version.</p>";
    }
    body += "<p>Thanks for using LucidPad â¤ï¸</p>";
    const tab = createTab(title, body, null);
    setActiveTab(tab.id);
    setTabDirty(tab, false);
  }

  async function showWhatsNewIfNeeded() {
    const currentVersion = await getAppVersion();
    if (!currentVersion) return;

    const storageKey = "lp:lastSeenVersion";
    const lastSeen = localStorage.getItem(storageKey);
    if (lastSeen === currentVersion) return;

    await openWhatsNewTab(true);
    localStorage.setItem(storageKey, currentVersion);
  }

  async function showWelcomeTipsIfNeeded() {
    const currentVersion = await getAppVersion();
    const onboardKey = "lp:onboardSeen";
    const onboardSeen = localStorage.getItem(onboardKey);
    if (currentVersion) {
      if (onboardSeen !== currentVersion) {
        openOnboardModal();
        return;
      }
    } else if (onboardSeen !== "1") {
      openOnboardModal();
      return;
    }
    const storageKey = "lp:welcomeTipsSeen";
    const lastSeen = localStorage.getItem(storageKey);
    if (currentVersion) {
      if (lastSeen === currentVersion) return;
    } else if (lastSeen === "1") {
      return;
    }
    openWelcomeModal();
  }

  async function loadReleaseData(version) {
    const empty = { highlights: [], added: [], improved: [], fixed: [] };
    try {
      const response = await fetch("release-notes.json", { cache: "no-store" });
      if (!response.ok) return empty;
      const data = await response.json();
      const entry = data?.[version];
      if (!entry) return empty;
      const normalize = (items) =>
        Array.isArray(items) ? items.filter((item) => typeof item === "string" && item.trim().length > 0) : [];
      if (Array.isArray(entry.highlights)) {
        return { ...empty, highlights: normalize(entry.highlights) };
      }
      return {
        highlights: [],
        added: normalize(entry.added),
        improved: normalize(entry.improved),
        fixed: normalize(entry.fixed)
      };
    } catch (_error) {
      return empty;
    }
  }

  function handlePlainEditorChange() {
    if (!plainEditorInstance) return;
    const tab = tabs.get(activeTabId);
    if (!tab) return;
    const text = plainEditorInstance.getText();
    tab.contentText = text;
    setTabDirty(tab, true);
    if (!tab.filePath) {
      setTabTitle(tab, deriveTabTitleFromText(text));
    }
    lastEditedAt = Date.now();
    scheduleStatusUpdate();
    schedulePersistTabs();
  }

  function handlePlainCursorMove() {
    scheduleStatusUpdate();
  }

  if (plainScroll && plainCanvas && plainSpacer && plainInput) {
    plainEditorInstance = new PlainTextEditor({
      scrollEl: plainScroll,
      canvas: plainCanvas,
      spacer: plainSpacer,
      input: plainInput,
      onChange: handlePlainEditorChange,
      onCursor: handlePlainCursorMove
    });
  }

  loadFooterSettings();
  clampSidePanelWidth();
  syncWindowControls();
  loadTrash();
  refreshBranchStatus();
  startSessionTimer();
  initTipTapEditor();
  initializeTabs().then(async () => {
    await showWhatsNewIfNeeded();
    await showWelcomeTipsIfNeeded();
    await checkMissingFiles();
  });
  const autoUpdateSetting = localStorage.getItem("lp:autoUpdate");
  const shouldAutoUpdate = autoUpdateSetting === null || autoUpdateSetting === "1";
  if (shouldAutoUpdate) {
    api?.action("update:check");
  }
})();



