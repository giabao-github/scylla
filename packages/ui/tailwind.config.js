module.exports = {
  theme: {
    extend: {
      width: {
        sidebar: "var(--sidebar-width)",
        "sidebar-mobile": "var(--sidebar-width-mobile)",
        "sidebar-icon": "var(--sidebar-width-icon)",
        "sidebar-icon-padded": "calc(var(--sidebar-width-icon) + 1rem + 2px)",
      },
      maxWidth: {
        skeleton: "var(--skeleton-width)",
      },
      inset: {
        "sidebar-neg": "calc(var(--sidebar-width) * -1)",
      },
    },
  },
};
