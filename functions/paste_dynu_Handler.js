export const turnIntoPasteDynuLink = async (text, title = "paste", lang = "text", isPrivate = 0, expireMinutes = 60) => {
  const response = await fetch("https://paste.dynu.net/api/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      text,
      title,
      private: isPrivate,
      lang,
      // expire: expireMinutes
    }).toString()
  });

  const result = await response.text();

  // Convert to /raw/ version
  // Input: https://paste.dynu.net/view/[pasteid]
  // Output: https://paste.dynu.net/view/raw/[pasteid]
  const rawLink = result.replace("/view/", "/view/raw/");

  return rawLink;
};
