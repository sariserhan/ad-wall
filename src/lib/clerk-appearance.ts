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

function profileAppearance(isDark: boolean) {
  const bg = isDark ? "#1e1c1a" : "#eeece7";
  const bg2 = isDark ? "#252220" : "#f6f4ef";
  const bg3 = isDark ? "#2a2825" : "#e4e2dc";
  const text = isDark ? "#ede9e3" : "#141414";
  const muted = isDark ? "#888" : "#666";
  const border = isDark ? "#3a3835" : "#b7b4ae";

  return {
    variables: {
      colorBackground: bg,
      colorInputBackground: bg2,
      colorText: text,
      colorTextSecondary: muted,
      colorPrimary: "#f43d38",
      colorDanger: "#f43d38",
      colorBorder: border,
      borderRadius: "0px",
      fontFamily: "var(--font-inter, Inter, sans-serif)",
      fontSize: "13px",
    },
    elements: {
      card: {
        background: bg,
        boxShadow: isDark ? "14px 18px 0 #0a0a0a" : "14px 18px 0 #151515",
        border: `1px solid ${border}`,
        borderRadius: "0",
      },
      navbar: {
        background: bg3,
        borderRight: `1px solid ${border}`,
      },
      navbarButton: {
        ...barlowUpper,
        fontWeight: "800",
        fontSize: "13px",
        borderRadius: "0",
        color: isDark ? "#aaa" : "#555",
      },
      navbarButtonActive__active: {
        color: text,
        background: bg,
      },
      navbarButtonIcon: {
        color: "inherit",
      },
      headerTitle: {
        ...barlowUpper,
        fontWeight: "900",
        fontSize: "22px",
        color: text,
      },
      headerSubtitle: {
        fontFamily: "var(--font-inter, Inter, sans-serif)",
        color: muted,
        fontSize: "12px",
      },
      breadcrumbsItem: {
        ...barlowUpper,
        fontWeight: "700",
        fontSize: "12px",
        color: isDark ? "#777" : "#888",
      },
      breadcrumbsItemDivider: {
        color: isDark ? "#666" : "#aaa",
      },
      pageScrollBox: {
        background: bg,
      },
      profileSectionTitleText: {
        ...barlowUpper,
        fontWeight: "900",
        fontSize: "17px",
        color: text,
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
        color: isDark ? "#aaa" : "#555",
        textTransform: "uppercase" as const,
        letterSpacing: "0.4px",
      },
      formFieldInput: {
        background: bg2,
        border: `1px solid ${border}`,
        borderRadius: "0",
        color: text,
        fontFamily: "var(--font-inter, Inter, sans-serif)",
        fontSize: "14px",
      },
      formButtonPrimary: {
        ...barlowUpper,
        background: text,
        color: bg,
        fontWeight: "800",
        fontSize: "13px",
        borderRadius: "0",
        boxShadow: "none",
      },
      formButtonReset: {
        fontFamily: "var(--font-inter, Inter, sans-serif)",
        fontSize: "12px",
        color: isDark ? "#aaa" : "#555",
        borderRadius: "0",
      },
      dividerLine: {
        background: border,
      },
      badge: {
        borderRadius: "0",
      },
      footer: {
        display: "none",
      },
    },
  } as const;
}

function userButtonAppearance(isDark: boolean) {
  const bg = isDark ? "#252220" : "var(--ui-bg)";
  const panel = isDark ? "#2a2825" : "var(--ui-bg)";
  const text = isDark ? "#ede9e3" : "#141414";
  const muted = isDark ? "#aaa" : "#666";
  const border = isDark ? "#3a3835" : "var(--ui-border)";

  return {
    variables: {
      colorBackground: bg,
      colorText: text,
      colorTextSecondary: muted,
      colorPrimary: "#f43d38",
      colorDanger: "#f43d38",
      borderRadius: "0rem",
    },
    elements: {
      userButtonPopoverCard: {
        boxShadow: isDark ? "6px 10px 32px #000a" : "6px 10px 32px #0008",
        borderTop: "2px solid #f43d38",
        borderRadius: "0",
        minWidth: "220px",
      },
      userButtonPopoverMain: {
        background: bg,
        borderBottom: `1px solid ${border}`,
        padding: "14px 16px 12px",
      },
      userButtonPopoverActions: {
        padding: "0",
        background: panel,
      },
      // Built-in items (manageAccount, signOut)
      userButtonPopoverActionButton: actionBtn,
      userButtonPopoverActionButtonIconBox: iconBox,
      // Custom items (My board, account actions)
      userButtonPopoverCustomItemButton: actionBtn,
      userButtonPopoverCustomItemButtonIconBox: iconBox,
      userButtonPopoverFooter: { display: "none" },
    },
  } as const;
}

export const getClerkUserProfileAppearance = (isDark: boolean) => profileAppearance(isDark);
export const getClerkUserButtonAppearance = (isDark: boolean) => userButtonAppearance(isDark);
