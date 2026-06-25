const barlowUpper = {
  fontFamily: "var(--font-barlow-condensed, 'Barlow Condensed', sans-serif)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
} as const;

const font = {
  ...barlowUpper,
  fontSize: "13px",
  fontWeight: "800",
} as const;

const iconBox = {
  width: "20px",
  minWidth: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const actionBtn = {
  borderRadius: "0",
  padding: "11px 16px",
  borderBottom: "1px solid var(--ui-border-3)",
  gap: "10px",
  ...font,
} as const;

export const clerkUserProfileAppearance = {
  variables: {
    colorBackground: "#eeece7",
    colorInputBackground: "#f6f4ef",
    colorText: "#141414",
    colorTextSecondary: "#666",
    colorPrimary: "#f43d38",
    colorDanger: "#f43d38",
    colorBorder: "#b7b4ae",
    borderRadius: "0px",
    fontFamily: "var(--font-inter, Inter, sans-serif)",
    fontSize: "13px",
  },
  elements: {
    card: {
      background: "#eeece7",
      boxShadow: "14px 18px 0 #151515",
      border: "1px solid #b7b4ae",
      borderRadius: "0",
    },
    navbar: {
      background: "#e4e2dc",
      borderRight: "1px solid #b7b4ae",
    },
    navbarButton: {
      ...barlowUpper,
      fontWeight: "800",
      fontSize: "13px",
      borderRadius: "0",
      color: "#555",
    },
    navbarButtonActive__active: {
      color: "#141414",
      background: "#eeece7",
    },
    navbarButtonIcon: {
      color: "inherit",
    },
    headerTitle: {
      ...barlowUpper,
      fontWeight: "900",
      fontSize: "22px",
      color: "#141414",
    },
    headerSubtitle: {
      fontFamily: "var(--font-inter, Inter, sans-serif)",
      color: "#666",
      fontSize: "12px",
    },
    breadcrumbsItem: {
      ...barlowUpper,
      fontWeight: "700",
      fontSize: "12px",
      color: "#888",
    },
    breadcrumbsItemDivider: {
      color: "#aaa",
    },
    pageScrollBox: {
      background: "#eeece7",
    },
    profileSectionTitleText: {
      ...barlowUpper,
      fontWeight: "900",
      fontSize: "17px",
      color: "#141414",
    },
    profileSectionPrimaryButton: {
      ...barlowUpper,
      fontWeight: "800",
      fontSize: "12px",
      color: "#f43d38",
      borderRadius: "0",
    },
    formFieldLabel: {
      fontFamily: "var(--font-inter, Inter, sans-serif)",
      fontSize: "11px",
      fontWeight: "600",
      color: "#555",
      textTransform: "uppercase" as const,
      letterSpacing: "0.4px",
    },
    formFieldInput: {
      background: "#f6f4ef",
      border: "1px solid #b7b4ae",
      borderRadius: "0",
      color: "#141414",
      fontFamily: "var(--font-inter, Inter, sans-serif)",
      fontSize: "14px",
    },
    formButtonPrimary: {
      ...barlowUpper,
      background: "#141414",
      color: "#eeece7",
      fontWeight: "800",
      fontSize: "13px",
      borderRadius: "0",
      boxShadow: "none",
    },
    formButtonReset: {
      fontFamily: "var(--font-inter, Inter, sans-serif)",
      fontSize: "12px",
      color: "#555",
      borderRadius: "0",
    },
    dividerLine: {
      background: "#b7b4ae",
    },
    badge: {
      borderRadius: "0",
    },
    footer: {
      display: "none",
    },
  },
} as const;

export const clerkUserButtonAppearance = {
  variables: {
    colorBackground: "var(--ui-bg)",
    colorText: "#141414",
    colorTextSecondary: "#666",
    colorPrimary: "#f43d38",
    colorDanger: "#f43d38",
    borderRadius: "0rem",
  },
  elements: {
    userButtonPopoverCard: {
      boxShadow: "6px 10px 32px #0008",
      borderTop: "2px solid #f43d38",
      borderRadius: "0",
      minWidth: "220px",
    },
    userButtonPopoverMain: {
      background: "var(--ui-bg)",
      borderBottom: "1px solid var(--ui-border)",
      padding: "14px 16px 12px",
    },
    userButtonPopoverActions: {
      padding: "0",
      background: "var(--ui-bg)",
    },
    // Built-in items (manageAccount, signOut)
    userButtonPopoverActionButton: actionBtn,
    userButtonPopoverActionButtonIconBox: iconBox,
    // Custom items (My board, Dark mode)
    userButtonPopoverCustomItemButton: actionBtn,
    userButtonPopoverCustomItemButtonIconBox: iconBox,
    userButtonPopoverFooter: { display: "none" },
  },
} as const;
