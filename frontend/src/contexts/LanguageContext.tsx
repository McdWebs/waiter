import { createContext, useContext, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'he'

const translations = {
  en: {
    // Common
    loading: 'Loading…',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    add: 'Add',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    langToggle: 'עברית',

    // Owner Login
    signInTitle: 'Sign in to manage your restaurant',
    signInDesc: 'Use the email and password you chose when creating your restaurant.',
    email: 'Email',
    password: 'Password',
    passwordHint: 'Password must be at least 8 characters.',
    signingIn: 'Signing in…',
    signIn: 'Sign in',
    noRestaurantYet: "Don't have a restaurant yet?",
    createOne: 'Create one',

    // Owner Signup
    createRestaurantTitle: 'Create your restaurant',
    createRestaurantDesc: 'Set up a restaurant, then you can build your menu and manage orders.',
    restaurantName: 'Restaurant name',
    publicSlug: 'Public URL slug (optional)',
    slugHint: "This will be used in links like /restaurant/your-slug/menu. If you leave it empty, we'll generate one from the restaurant name.",
    currency: 'Currency',
    ownerEmail: 'Owner email',
    passwordSignupHint: "You'll use this email and password to sign in and manage your restaurant.",
    creating: 'Creating…',
    createRestaurant: 'Create restaurant',
    alreadyHaveRestaurant: 'Already have a restaurant?',
    atLeast8Chars: 'At least 8 characters',

    // Owner Dashboard Layout
    menu: 'Menu',
    stats: 'Stats',
    promotions: 'Promotions',
    loyalty: 'Loyalty',
    qrCodes: 'QR Codes',
    settings: 'Settings',
    feedback: 'Feedback',
    guestMenu: 'Guest menu',
    kitchen: 'Kitchen',
    signOut: 'Sign out',
    signOutQuestion: 'Sign out?',
    signOutDesc: "You'll need to sign in again to access the dashboard.",
    suspendedBanner: 'Your restaurant is currently suspended. Public menu and orders are disabled. Contact support.',

    // Admin Menu Page
    loadingMenu: 'Loading menu…',
    addCategory: 'Add category',
    newCategoryName: 'New category name',
    bulkImport: 'Bulk import',
    bulkImportFromText: 'Bulk import from text',
    businessPlans: 'Business plans (עסקיות)',
    businessPlansDesc: 'Fixed-price business meals: pick items from your menu. Guests see these at the top of the menu.',
    newBusinessPlan: '+ New business plan',
    editBusinessPlan: 'Edit business plan',
    newBusinessPlanTitle: 'New business plan',
    noBusinessPlans: 'No business plans yet. Click "New business plan" to add one.',
    noCategories: 'No categories yet. Add one above.',
    noItemsInCategory: 'No items in this category yet.',
    actions: 'Actions',
    markAvailable: 'Mark available',
    markUnavailable: 'Mark unavailable',
    confirmDelete: 'Confirm delete',
    deleteCategoryConfirm: (name: string) => `Delete category "${name}" and all its items?`,
    deleteItemConfirm: (name: string) => `Delete item "${name}"?`,
    addItemTitle: 'Add item',
    addItemDesc: (cat: string) => `Create a new menu item in ${cat}.`,
    editItemTitle: 'Edit item',
    editItemDesc: (name: string) => `Update the details for ${name}.`,
    itemName: 'Item name',
    price: 'Price',
    shortDescription: 'Short description',
    allergens: 'Allergens (choose or add custom)',
    allergensCustomPlaceholder: 'Custom allergens (comma separated, optional)',
    tags: 'Tags (choose or add custom)',
    tagsCustomPlaceholder: 'Custom tags (comma separated, optional)',
    itemPhotoOptional: 'Item photo (optional)',
    itemPhoto: 'Item photo',
    uploadItemImage: 'Upload item image',
    changeImage: 'Change image',
    uploadImage: 'Upload image',
    imageHint: 'Square image works best · max 5MB',
    previewSelected: 'Preview selected below',
    removeImage: 'Remove image',
    removeNewImage: 'Remove new image',
    removeExistingImage: 'Remove existing image',
    availability: 'Availability',
    itemAvailableLabel: 'Item available for ordering',
    noTagsOrAllergens: 'No tags or allergens set',
    renameCategoryTitle: 'Rename category',
    moveUp: 'Move up',
    moveDown: 'Move down',
    deleteCategory: 'Delete category',
    collapse: 'Collapse',
    expand: 'Expand',
    addItemBtn: 'Add item',
    categoryNamePlaceholder: 'Category name',

    // Bulk import
    bulkImportDesc: 'Paste your menu text below. A line without a dash is treated as a category name. A line like',
    bulkImportExample: 'is treated as an item.',
    bulkImportNoValid: 'No valid categories or items detected yet. Make sure items use a dash (—) separator.',
    bulkImportPreview: (cats: number, items: number) =>
      `Preview — ${cats} ${cats === 1 ? 'category' : 'categories'}, ${items} ${items === 1 ? 'item' : 'items'}`,
    bulkImporting: (done: number, total: number) => `Importing… ${done} / ${total} items`,
    bulkImportBtn: (items: number, cats: number) =>
      `Import ${items} item${items === 1 ? '' : 's'} in ${cats} categor${cats === 1 ? 'y' : 'ies'}`,
    importBtn: 'Import',
    hidden: 'Hidden',
    active: 'Active',

    // Kitchen
    orders: 'Orders',
    tables: 'Tables',
    history: 'History',
    newOrder: 'New',
    preparing: 'Preparing',
    ready: 'Ready',
    noOpenOrders: 'No open orders',
    waiterCalls: 'Waiter calls',
    handled: 'Handled',
    markHandled: 'Mark handled',
    table: 'Table',
    activeOrders: 'Active orders',
    readyOrders: 'Ready orders',
    allStatuses: 'All statuses',
    applyFilters: 'Apply filters',
    from: 'From',
    to: 'To',
    noOrdersForFilters: 'No orders for selected filters.',
    manageTables: 'Manage tables',
    newTable: '+ New table',
    bulkCreate: 'Bulk create',
    clearingTables: 'Clearing tables…',
    markPaidClear: 'Mark paid & clear selected tables',
    merge: 'Merge',
    allTables: 'All tables',
    noTable: 'No table',
    creatingTable: 'Creating…',
    createTable: 'Create table',
    createTables: 'Create tables',
    kitchenLabel: 'Kitchen',
    kitchenSubtitle: 'Incoming orders and waiter calls in real time.',

    // Settings
    saveSettings: 'Save settings',
    saving: 'Saving…',
    settingsSaved: 'Settings saved',

    // Feedback
    sendFeedback: 'Send feedback',
    feedbackTitle: 'Feedback / Bug reports',
    feedbackDesc: 'Send feedback or report a bug. The platform admin can see your messages and reply here.',
    feedbackSendNew: 'Send new',
    feedbackType: 'Type',
    feedbackMessage: 'Message',
    feedbackPlaceholder: 'Describe your feedback or the bug you encountered…',
    sending: 'Sending…',
    send: 'Send',
    feedbackSent: 'Thank you! Your message has been sent.',
    bugReport: 'Bug report',
    generalFeedback: 'General feedback',
    feedbackFeedback: 'Feedback',
    feedbackBug: 'Bug',
    yourFeedback: 'Your feedback',
    yourFeedbackDesc: 'All messages you sent. Status shows whether support has seen or replied.',
    noFeedbackYet: 'No feedback sent yet. Use the form above to send your first message.',
    feedbackStatusNew: 'New',
    feedbackStatusSeen: 'Seen',
    feedbackStatusReplied: 'Replied',
    replyFromSupport: 'Reply from support',

    // Stats
    ordersToday: 'Orders today',
    ordersThisWeek: 'This week',
    ordersThisMonth: 'This month',
    totalOrders: 'Total orders',
    revenue: 'Revenue',
    avgOrder: 'Avg order',
    revenueToday: 'Revenue today',
    avgOrderValue: 'Avg order value',
    allTime: 'All time',
    ordersByPeriod: 'Orders by period',
    revenueByPeriod: 'Revenue by period',
    today: 'Today',
    totalRevenue: 'Total revenue',
    operationsEngagement: 'Operations & engagement',
    waiterCallsHandled: 'Waiter calls handled',
    waiterCallsThisWeek: 'Waiter calls (this week)',
    avgResponseTime: 'Avg response time',
    chatSessions: 'Chat sessions',
    statsOverview: 'Overview',
    restaurantStats: 'Your restaurant stats',
    exportExcel: '⬇ Export Excel',
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    thisWeekLabel: 'This week',
    thisMonthLabel: 'This month',
    thisWeekSuffix: 'this week',
  },
  he: {
    // Common
    loading: 'טוען...',
    cancel: 'ביטול',
    save: 'שמור',
    edit: 'עריכה',
    delete: 'מחיקה',
    add: 'הוסף',
    close: 'סגור',
    yes: 'כן',
    no: 'לא',
    langToggle: 'English',

    // Owner Login
    signInTitle: 'התחברות לניהול המסעדה',
    signInDesc: 'השתמש באימייל והסיסמה שבחרת בעת יצירת המסעדה.',
    email: 'אימייל',
    password: 'סיסמה',
    passwordHint: 'הסיסמה חייבת להכיל לפחות 8 תווים.',
    signingIn: 'מתחבר...',
    signIn: 'התחברות',
    noRestaurantYet: 'אין לך מסעדה עדיין?',
    createOne: 'צור אחת',

    // Owner Signup
    createRestaurantTitle: 'יצירת המסעדה שלך',
    createRestaurantDesc: 'הגדר מסעדה ותוכל לבנות את התפריט ולנהל הזמנות.',
    restaurantName: 'שם המסעדה',
    publicSlug: 'כתובת URL ציבורית (אופציונלי)',
    slugHint: 'ישמש בקישורים כמו /restaurant/your-slug/menu. אם תשאיר ריק, נגדיר אחד מהשם.',
    currency: 'מטבע',
    ownerEmail: 'אימייל בעלים',
    passwordSignupHint: 'תשתמש באימייל וסיסמה אלו להתחברות ולניהול המסעדה.',
    creating: 'יוצר...',
    createRestaurant: 'צור מסעדה',
    alreadyHaveRestaurant: 'כבר יש לך מסעדה?',
    atLeast8Chars: 'לפחות 8 תווים',

    // Owner Dashboard Layout
    menu: 'תפריט',
    stats: 'סטטיסטיקות',
    promotions: 'מבצעים',
    loyalty: 'לויאלטי',
    qrCodes: 'QR Codes',
    settings: 'הגדרות',
    feedback: 'פידבק',
    guestMenu: 'תפריט לאורח',
    kitchen: 'מטבח',
    signOut: 'יציאה',
    signOutQuestion: 'לצאת מהחשבון?',
    signOutDesc: 'תצטרך להתחבר שוב כדי לגשת ללוח הבקרה.',
    suspendedBanner: 'המסעדה שלך מושהית כרגע. התפריט הציבורי וההזמנות מושבתים. פנה לתמיכה.',

    // Admin Menu Page
    loadingMenu: 'טוען תפריט...',
    addCategory: 'הוסף קטגוריה',
    newCategoryName: 'שם קטגוריה חדש',
    bulkImport: 'ייבוא מאסיבי',
    bulkImportFromText: 'ייבוא מאסיבי מטקסט',
    businessPlans: 'עסקיות',
    businessPlansDesc: 'ארוחות עסקיות במחיר קבוע: בחר פריטים מהתפריט. האורחים רואים אותן בראש התפריט.',
    newBusinessPlan: '+ תוכנית עסקית חדשה',
    editBusinessPlan: 'עריכת עסקית',
    newBusinessPlanTitle: 'תוכנית עסקית חדשה',
    noBusinessPlans: 'אין תוכניות עסקיות עדיין. לחץ על "תוכנית עסקית חדשה" להוספה.',
    noCategories: 'אין קטגוריות עדיין. הוסף אחת למעלה.',
    noItemsInCategory: 'אין פריטים בקטגוריה זו עדיין.',
    actions: 'פעולות',
    markAvailable: 'סמן כזמין',
    markUnavailable: 'סמן כלא זמין',
    confirmDelete: 'אשר מחיקה',
    deleteCategoryConfirm: (name: string) => `למחוק קטגוריה "${name}" ואת כל הפריטים שלה?`,
    deleteItemConfirm: (name: string) => `למחוק פריט "${name}"?`,
    addItemTitle: 'הוסף פריט',
    addItemDesc: (cat: string) => `צור פריט חדש בקטגוריה ${cat}.`,
    editItemTitle: 'עריכת פריט',
    editItemDesc: (name: string) => `עדכן את הפרטים של ${name}.`,
    itemName: 'שם הפריט',
    price: 'מחיר',
    shortDescription: 'תיאור קצר',
    allergens: 'אלרגנים (בחר או הוסף)',
    allergensCustomPlaceholder: 'אלרגנים מותאמים (מופרדים בפסיק, אופציונלי)',
    tags: 'תגיות (בחר או הוסף)',
    tagsCustomPlaceholder: 'תגיות מותאמות (מופרדות בפסיק, אופציונלי)',
    itemPhotoOptional: 'תמונת פריט (אופציונלי)',
    itemPhoto: 'תמונת פריט',
    uploadItemImage: 'העלה תמונת פריט',
    changeImage: 'שנה תמונה',
    uploadImage: 'העלה תמונה',
    imageHint: 'תמונה מרובעת עובדת הכי טוב · מקס 5MB',
    previewSelected: 'תצוגה מקדימה למטה',
    removeImage: 'הסר תמונה',
    removeNewImage: 'הסר תמונה חדשה',
    removeExistingImage: 'הסר תמונה קיימת',
    availability: 'זמינות',
    itemAvailableLabel: 'הפריט זמין להזמנה',
    noTagsOrAllergens: 'אין תגיות או אלרגנים',
    renameCategoryTitle: 'שנה שם קטגוריה',
    moveUp: 'הזז למעלה',
    moveDown: 'הזז למטה',
    deleteCategory: 'מחק קטגוריה',
    collapse: 'כווץ',
    expand: 'הרחב',
    addItemBtn: 'הוסף פריט',
    categoryNamePlaceholder: 'שם קטגוריה',

    // Bulk import
    bulkImportDesc: 'הדבק את טקסט התפריט למטה. שורה ללא מקף נחשבת כשם קטגוריה. שורה כמו',
    bulkImportExample: 'נחשבת כפריט.',
    bulkImportNoValid: 'לא זוהו קטגוריות או פריטים תקפים עדיין. ודא שפריטים משתמשים במפריד מקף (—).',
    bulkImportPreview: (cats: number, items: number) =>
      `תצוגה מקדימה — ${cats} ${cats === 1 ? 'קטגוריה' : 'קטגוריות'}, ${items} ${items === 1 ? 'פריט' : 'פריטים'}`,
    bulkImporting: (done: number, total: number) => `מייבא... ${done} / ${total} פריטים`,
    bulkImportBtn: (items: number, cats: number) =>
      `ייבא ${items} ${items === 1 ? 'פריט' : 'פריטים'} ב-${cats} ${cats === 1 ? 'קטגוריה' : 'קטגוריות'}`,
    importBtn: 'ייבא',
    hidden: 'מוסתר',
    active: 'פעיל',

    // Kitchen
    orders: 'הזמנות',
    tables: 'שולחנות',
    history: 'היסטוריה',
    newOrder: 'חדש',
    preparing: 'בהכנה',
    ready: 'מוכן',
    noOpenOrders: 'אין הזמנות פתוחות',
    waiterCalls: 'קריאות למלצר',
    handled: 'טופל',
    markHandled: 'סמן כטופל',
    table: 'שולחן',
    activeOrders: 'הזמנות פעילות',
    readyOrders: 'הזמנות מוכנות',
    allStatuses: 'כל הסטטוסים',
    applyFilters: 'החל סינון',
    from: 'מ-',
    to: 'עד',
    noOrdersForFilters: 'אין הזמנות לפי הסינון שנבחר.',
    manageTables: 'ניהול שולחנות',
    newTable: '+ שולחן חדש',
    bulkCreate: 'יצירה מרובה',
    clearingTables: 'מנקה שולחנות...',
    markPaidClear: 'סמן כשולם ונקה שולחנות נבחרים',
    merge: 'מזג',
    allTables: 'כל השולחנות',
    noTable: 'ללא שולחן',
    creatingTable: 'יוצר...',
    createTable: 'צור שולחן',
    createTables: 'צור שולחנות',
    kitchenLabel: 'מטבח',
    kitchenSubtitle: 'הזמנות נכנסות וקריאות מלצר בזמן אמת.',

    // Settings
    saveSettings: 'שמור הגדרות',
    saving: 'שומר...',
    settingsSaved: 'ההגדרות נשמרו',

    // Feedback
    sendFeedback: 'שלח פידבק',
    feedbackTitle: 'פידבק / דיווחי באגים',
    feedbackDesc: 'שלח פידבק או דווח על באג. מנהל הפלטפורמה יכול לראות את ההודעות שלך ולענות כאן.',
    feedbackSendNew: 'שלח חדש',
    feedbackType: 'סוג',
    feedbackMessage: 'הודעה',
    feedbackPlaceholder: 'תאר את הפידבק שלך או את הבאג שמצאת...',
    sending: 'שולח...',
    send: 'שלח',
    feedbackSent: 'תודה! ההודעה נשלחה.',
    bugReport: 'דיווח על באג',
    generalFeedback: 'פידבק כללי',
    feedbackFeedback: 'פידבק',
    feedbackBug: 'באג',
    yourFeedback: 'הפידבק שלך',
    yourFeedbackDesc: 'כל ההודעות שנשלחו. הסטטוס מראה אם התמיכה ראתה או ענתה.',
    noFeedbackYet: 'אין פידבק עדיין. השתמש בטופס למעלה לשליחת ההודעה הראשונה.',
    feedbackStatusNew: 'חדש',
    feedbackStatusSeen: 'נראה',
    feedbackStatusReplied: 'נענה',
    replyFromSupport: 'תשובה מהתמיכה',

    // Stats
    ordersToday: 'הזמנות היום',
    ordersThisWeek: 'השבוע',
    ordersThisMonth: 'החודש',
    totalOrders: 'סה"כ הזמנות',
    revenue: 'הכנסות',
    avgOrder: 'ממוצע הזמנה',
    revenueToday: 'הכנסות היום',
    avgOrderValue: 'ממוצע הזמנה',
    allTime: 'כל הזמנים',
    ordersByPeriod: 'הזמנות לפי תקופה',
    revenueByPeriod: 'הכנסות לפי תקופה',
    today: 'היום',
    totalRevenue: 'סה"כ הכנסות',
    operationsEngagement: 'תפעול ומעורבות',
    waiterCallsHandled: 'קריאות מלצר שטופלו',
    waiterCallsThisWeek: 'קריאות מלצר (השבוע)',
    avgResponseTime: 'זמן תגובה ממוצע',
    chatSessions: 'שיחות צ\'אט',
    statsOverview: 'סקירה כללית',
    restaurantStats: 'סטטיסטיקות המסעדה שלך',
    exportExcel: '⬇ ייצא Excel',
    refresh: 'רענן',
    refreshing: 'מרענן...',
    thisWeekLabel: 'השבוע',
    thisMonthLabel: 'החודש',
    thisWeekSuffix: 'השבוע',
  },
} as const

type StringKeys = {
  [K in keyof typeof translations.en]: typeof translations.en[K] extends string ? K : never
}[keyof typeof translations.en]

type FnKeys = {
  [K in keyof typeof translations.en]: typeof translations.en[K] extends (...args: any[]) => string ? K : never
}[keyof typeof translations.en]

interface LangContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: StringKeys) => string
  tf: <K extends FnKeys>(key: K, ...args: Parameters<typeof translations.en[K]>) => string
  dir: 'ltr' | 'rtl'
}

const LangContext = createContext<LangContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('servo_lang') as Lang) ?? 'he'
    }
    return 'he'
  })

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('servo_lang', l)
  }

  const t = (key: StringKeys): string => translations[lang][key] as string

  const tf = <K extends FnKeys>(key: K, ...args: Parameters<typeof translations.en[K]>): string => {
    const fn = translations[lang][key] as (...args: any[]) => string
    return fn(...args)
  }

  const dir: 'ltr' | 'rtl' = lang === 'he' ? 'rtl' : 'ltr'

  return (
    <LangContext.Provider value={{ lang, setLang, t, tf, dir }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider')
  return ctx
}
