For customers (guests)

Estimated wait / order status on menu
You already have order status (new → preparing → ready). Show a short line on the menu or in the cart: “Your order: in the kitchen” or “Ready in ~X min” (using orderLeadTimeMinutes or a simple estimate). Reduces “where’s my order?” questions.


Restaurant info on menu page
One line or small block: address, opening hours (from openingHoursNote), phone, “Call waiter” already there. Optional: link to map (e.g. Google Maps with address). Uses what you already store and improves trust.


Social links
As in your instructions.md: add Instagram/Facebook/website in owner settings and show them on the customer menu page (footer or header). Good for discovery and repeat visits.


For owners

Social links in settings
Fields for website, Instagram, Facebook (and maybe TikTok). Store in Restaurant and expose in the public menu API so the frontend can show them (see “Social links” for customers above).


Peak hours / simple capacity
In stats, add a simple “Orders by hour” (or by 30 min) so owners see lunch/dinner peaks. Optionally: “Max concurrent orders” or “Pause new orders” when the kitchen is overloaded (could tie to allowOrders or a dedicated “busy” toggle).


Waiter-call dashboard
You already have waiter calls and “handled”. Add a small owner (or reception) view: list of open waiter calls with table and time. So staff can see “Table 5 – 3 min ago” and mark handled without opening the kitchen screen.


Export for accounting
From owner stats, add “Export CSV” (e.g. orders in a date range: time, table, items, amount). Helps with daily/weekly reports and bookkeeping.


Promo / discount codes (optional)
Simple codes (e.g. “LUNCH10” = 10% off) that the customer can enter in cart or bill. Owner defines in settings and sees usage in stats. Can be a later phase.


Cross-cutting (owner + customer)

Restaurant slug / QR
You have slugs. Ensure each restaurant has a stable URL like yoursite.com/restaurant/:slug/menu?table=5. Owners can print QR codes per table linking to that URL so guests open the right menu and table in one tap.


Clear “table not set” behavior
When table= is missing, show a short message: “Enter your table number” or “Scan the QR at your table” and optionally a table input so one URL works for all tables