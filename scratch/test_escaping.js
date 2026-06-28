const scriptTemplate = () => {
  return `
    (function() {
      let cleanHtml = 'some html';
      cleanHtml = cleanHtml.replace('<script src="js/app.js"><\\/script>', '<script>' + jsText + '<\\/script>');
      cleanHtml = cleanHtml.replace(/<script[^>]*>(?:(?!<\\/script>)[\\\\s\\\\S])*?studios_pro_channel[\\\\s\\\\S]*?<\\\\/script>/gi, '');
    })();
  `;
};

const generatedCode = scriptTemplate();
console.log("Generated Code in file:\\n", generatedCode);
