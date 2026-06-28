chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "preview-3d-model",
    title: "Preview 3D/CAD in Studios-Pro",
    contexts: ["link"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "preview-3d-model") {
    const linkUrl = info.linkUrl;
    if (linkUrl) {
      const extension = linkUrl.split('.').pop().split('?')[0].toLowerCase();
      const validExtensions = ['stl', 'obj', 'glb', 'dxf', 'gcode', 'svg'];
      
      if (validExtensions.includes(extension)) {
        // Open Studios-Pro with the file URL query param
        const targetUrl = `https://studios-pro.com/?ref=s3dviewer&file_url=${encodeURIComponent(linkUrl)}`;
        chrome.tabs.create({ url: targetUrl });
      } else {
        // Fallback for general links, or show alert
        const fallbackUrl = `https://studios-pro.com/?ref=s3dviewer`;
        chrome.tabs.create({ url: fallbackUrl });
      }
    }
  }
});
