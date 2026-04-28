# Godavari Matters

A civic grievance platform for Greater Rajamahendravaram Municipal Corporation (GRMC). Citizens can report sanitation issues, track accountability chains, and monitor ward-level performance — all from their phone.

**Live:** [godavarimatters.vercel.app](https://godavarimatters.vercel.app)

## What it does

- **Report issues** — snap a photo, drop a pin, submit. Reports are routed to the responsible ward and sachivalayam.
- **Ward map** — interactive map with all 104 GRMC wards (95 sachivalayams + 9 merged areas). Tap any ward to see details.
- **Accountability chain** — see exactly who's responsible: from the Ward Sanitation Secretary up to the Municipal Health Officer.
- **Statistics** — city-wide dashboard showing unresolved reports, resolution rates, and worst-performing wards.
- **QR sharing** — generate shareable QR codes for individual reports.

## Tech stack

- React 19 + Vite
- Leaflet (interactive maps)
- Supabase (database + auth)
- Cloudinary (image uploads)
- Vercel (hosting)

## Local development

```bash
cd app
npm install
npm run dev
```

Create `app/.env` with your Supabase and Cloudinary keys:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_CLOUDINARY_CLOUD=...
VITE_CLOUDINARY_PRESET=...
```

## Project structure

```
app/
├── public/           # GeoJSON boundaries, governance data, static assets
├── src/
│   ├── components/   # React components (MapView, BlameTree, sheets, etc.)
│   ├── lib/          # Store, jurisdiction detection, utilities
│   └── main.jsx      # Entry point
└── vite.config.js
```

## Data sources

- Ward boundaries sourced from APSAC and GRMC sachivalayam records
- Official hierarchy based on GRMC municipal structure (Commissioner → MHO → Sanitary Supervisor → WSES)
- Elected representatives: current MLA (Rajahmundry City) and MP (Rajahmundry Parliamentary Constituency)

## License

MIT
