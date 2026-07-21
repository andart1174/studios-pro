chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "preview-3d-model-ar",
    title: "View in AR with Studios-Pro",
    contexts: ["link"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "preview-3d-model-ar") {
    const linkUrl = info.linkUrl;
    if (linkUrl) {
      const extension = linkUrl.split('.').pop().split('?')[0].toLowerCase();
      const validExtensions = ['stl', 'obj', 'glb', 'gltf'];
      
      if (validExtensions.includes(extension)) {
        // Open Studios-Pro AR viewer with the file URL query param
        const targetUrl = `https://studios-pro.com/apps/ar-viewer/index.html?url=${encodeURIComponent(linkUrl)}`;
        chrome.tabs.create({ url: targetUrl });
      } else {
        // Fallback to the main AR viewer page
        const fallbackUrl = `https://studios-pro.com/apps/ar-viewer/index.html`;
        chrome.tabs.create({ url: fallbackUrl });
      }
    }
  }
});
