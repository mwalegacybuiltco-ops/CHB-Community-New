// Canine Haven Boutique Community (Affiliate-only)
// Paste your links below (Google Sheets must be published as CSV)

window.CHB_COMMUNITY = {
  // REQUIRED: Posts CSV feed (Google Sheet -> File -> Share -> Publish to web -> CSV)
  FEED_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTj-xUDGMddo_Zapki7VPxab5lEyDcT4M1fBUpV0_VhXEP7ns4QbXjqt5tomnqFCnh5PaYggDZuilaR/pub?gid=571596116&single=true&output=csv",

  // OPTIONAL: Comments CSV feed (separate Google Sheet for comment form responses)
  COMMENTS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTj-xUDGMddo_Zapki7VPxab5lEyDcT4M1fBUpV0_VhXEP7ns4QbXjqt5tomnqFCnh5PaYggDZuilaR/pub?gid=571596116&single=true&output=csv",

  // REQUIRED: Google Form link for creating a post (the post form)
  POST_FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLScGhWFqYLmFh06snGMdVGbftUCLfZPANt-RbI6phUbHMmEAdw/viewform?usp=header",

  // OPTIONAL: Google Form base link for commenting (do NOT use /prefill)
  COMMENT_FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLScH6C3Qt7MiJIyrjPBV7LawcdoMIc2-pqGVwrBPmm3I8Fx2GA/viewform?usp=header",

  // OPTIONAL: Comment form entry IDs (from your pre-filled link)
 COMMENT_FORM: {
  postIdEntry: "entry.1652175336",
  nameEntry: "entry.14847401",
  commentEntry: "entry.259428025",
  rulesEntry: "entry.1849769871",
  rulesValue: "Option 1"
},


  // OPTIONAL LINKS (tabs)
  SHOP_URL: "PASTE_YOUR_SHOP_URL_HERE",
  EVENTS_URL: "PASTE_YOUR_EVENTS_URL_HERE",
  FILES_URL: "PASTE_YOUR_FILES_URL_HERE",

  // Affiliate Menu links (1–5)
  MENU_URLS: {
    start: "PASTE_START_HERE_URL_HERE",
    training: "PASTE_TRAINING_URL_HERE",
    vault: "PASTE_CONTENT_VAULT_URL_HERE",
    mediaAssets: "PASTE_MEDIA_ASSETS_URL_HERE",
    links: "PASTE_IMPORTANT_LINKS_URL_HERE"
  },

  // Column names (must match the CSV headers EXACTLY)
  // Common Google Forms headers: Timestamp, Display name, Channel, Post, pup pics, status, pinned
  FIELDS: {
    timestamp: "Timestamp",
    name: "Display name",
    channel: "Channel",
    post: "Post",
    photo: "Pup Pics",
    status: "Status",
    pinned: "Pinned"
  },

  // Comment sheet headers (must match your comment form response sheet)
  COMMENT_FIELDS: {
    timestamp: "Timestamp",
    postId: "Post ID",
    name: "Display Name",
    comment: "Comment"
  },

  CHANNELS: [
    "Announcements",
    "New Drops",
    "Pup Pics",
    "Questions",
    "Reviews / Wins"
  ]
};
