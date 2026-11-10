// הגדרות הדשבורד. זה הקובץ הראשון לשנות כשרוצים להוסיף תחום, סטטוס או שדה.

window.DR_CONFIG = {
  // חיבור ל־Supabase של דניאל (ערכים ציבוריים שמיועדים לדפדפן, לא סודות).
  // כל עוד הם ריקים, הנתונים נשמרים רק בדפדפן הזה (localStorage).
  // אחרי שמריצים את supabase/schema.sql, מעתיקים לכאן את Project URL ואת ה־Publishable key.
  supabaseUrl: "",
  supabaseKey: "",

  // תחומי עסק לבחירה
  domains: [
    "מסעדנות ואוכל",
    "קמעונאות וחנויות",
    "יופי וקוסמטיקה",
    "בריאות וטיפולים",
    "כושר וספורט",
    "אופנה",
    "נדל\"ן",
    "בנייה ושיפוצים",
    "עיצוב פנים ואדריכלות",
    "שירותים מקצועיים (עו\"ד / רו\"ח / ביטוח)",
    "ייעוץ ואימון",
    "חינוך והדרכה",
    "טכנולוגיה ודיגיטל",
    "שיווק ופרסום",
    "תעשייה וייצור",
    "תיירות ואירוח",
    "אירועים",
    "רכב ותחבורה",
    "אחר"
  ],

  // סטטוסים, לפי סדר התהליך. stage: open = בטיפול, meeting = פגישה, won = נסגר, lost = לא רלוונטי.
  statuses: [
    { key: "llm1", label: "לל\"מ 1", stage: "open" },
    { key: "llm2", label: "לל\"מ 2", stage: "open" },
    { key: "llm3", label: "לל\"מ 3", stage: "open" },
    { key: "llm4", label: "לל\"מ 4", stage: "open" },
    { key: "llm5", label: "לל\"מ 5", stage: "open" },
    { key: "llm6", label: "לל\"מ 6", stage: "open" },
    { key: "llm7", label: "לל\"מ 7", stage: "open" },
    { key: "llm8", label: "לל\"מ 8", stage: "open" },
    { key: "meeting_set", label: "נקבעה פגישה", stage: "meeting" },
    { key: "after_meeting", label: "אחרי פגישה", stage: "meeting" },
    { key: "closed", label: "נסגר תהליך", stage: "won" },
    { key: "irrelevant", label: "לא רלוונטי", stage: "lost" }
  ]
};
