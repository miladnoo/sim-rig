import { formatServiceDate, formatMileage } from './dates'

export function buildServiceHistoryHTML(
  carName: string,
  mileage: string | null,
  services: { date: string; description: string; mileage: string | null; cost: string | null; part_number?: string | null }[],
  carPhotoBase64?: string | null,
  receiptsHtml = '',
  carPhotoMime = 'image/jpeg',
): string {
  const cleanCost = (cost: string | null) => (cost || '').replace(/[^0-9.]/g, '')
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const rows = services
    .map(
      (s, i) => {
        const clean = cleanCost(s.cost)
        const miles = formatMileage(s.mileage) || '-'
        return `
      <tr${i % 2 === 0 ? '' : ' class="alt"'}>
        <td>${escape(formatServiceDate(s.date))}</td>
        <td>${escape(s.description)}${s.part_number ? `<br/><span style="color:#666;font-size:9pt">${escape(s.part_number)}</span>` : ''}</td>
        <td>${escape(String(miles))}</td>
        <td>${clean ? `$${clean}` : '-'}</td>
      </tr>`
      }
    )
    .join('')
  const total = services.reduce((sum, s) => sum + (parseFloat(cleanCost(s.cost)) || 0), 0)
  const milesLine = formatMileage(mileage)

  const photoHtml = carPhotoBase64
    ? `<img src="data:${carPhotoMime};base64,${carPhotoBase64}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-bottom:16px;" />`
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: -apple-system, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      color: #0F172A;
      padding: 32px;
      line-height: 1.5;
    }
    h1 {
      font-size: 20pt;
      font-weight: 700;
      margin-bottom: 4px;
      color: #0F172A;
    }
    .subtitle {
      font-size: 10pt;
      color: #475569;
      margin-bottom: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    th {
      text-align: left;
      padding: 8px 12px;
      background: #0F172A;
      color: #fff;
      font-weight: 600;
      font-size: 10pt;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 10pt;
    }
    tr.alt td {
      background: #F8FAFC;
    }
    .total {
      margin-top: 16px;
      text-align: right;
      font-size: 12pt;
      font-weight: 700;
    }
    .receipt {
      margin-top: 20px;
      page-break-inside: avoid;
    }
    .receipt img {
      width: 100%;
      max-height: 280px;
      object-fit: contain;
      border: 1px solid #E2E8F0;
    }
    .receipt p {
      font-size: 9pt;
      color: #475569;
      margin: 6px 0 0;
    }
    .footer {
      margin-top: 32px;
      font-size: 8pt;
      color: #94A3B8;
      text-align: center;
    }
  </style>
</head>
<body>
  ${photoHtml}
  <h1>${escape(carName)}</h1>
  <div class="subtitle">Service history${milesLine ? ` · ${milesLine} miles` : ''}</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Work</th>
        <th>Miles</th>
        <th>Cost</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4" style="text-align:center;color:#94A3B8;padding:24px;">No service records</td></tr>'}
    </tbody>
  </table>
  ${total > 0 ? `<div class="total">Total: $${total.toFixed(2)}</div>` : ''}
  ${receiptsHtml}
  <div class="footer">Classic Garage · ${escape(carName)}</div>
</body>
</html>`
}
