export const PATCH = {
  af447(d) {
    d.track[2].quality = 'recorded'; d.track[2].method = `Position the aircraft reported by automatic data message, not a radar return. ${d.track[2].method}`;
    d.evidence_points[0].quality = 'recorded';
    d.why_it_matters = d.why_it_matters?.replace('pp.3–4', 'pp.4–5');
    for (const s of d.sources) if (s.notes) s.notes = s.notes.replace('pp.3–4', 'pp.4–5');
  },
  airnz901(d) { for (const s of d.sources) if (s.notes) s.notes = s.notes.replace('Section 2.2, printed p. 8 / PDF p. 14', 'Section 2.2, printed pp. 8–9 / PDF pp. 14–15'); },
  earhart(d) {
    const a = d.sources.find((s) => s.id === 's4'), b = d.sources.find((s) => s.id === 's5');
    [a.url, b.url] = [b.url, a.url]; [a.title, b.title] = [b.title, a.title];
    a.notes = `${a.notes} Contains the 0345–0647 entries.`; b.notes = `${b.notes} Contains the 0658 entries onward, including 0740.`;
  },
  egyptair990(d) { for (const s of d.sources) if (s.id === 's13' && s.notes) s.notes = s.notes.replace('Two-page', 'One-page'); },
  jal123(d) {
    d.site.elev_ft = 5135;
    d.site.description = d.site.description.replace('The report gives conflicting main-site elevations, 1,585 m in section 2.1 and 1,565 m in section 2.3, so a single elevation is withheld.', 'Sections 2.1 and 2.3 both give about 1,565 m, about 5,135 ft.');
    d.conflicts = d.conflicts.filter((c) => c.about !== 'Main crash-site elevation');
    d.evidence_points[0].detail = d.evidence_points[0].detail.replace('Datum assumption and elevation conflict are described in site.', 'The datum assumption is described in site.');
    d.unknowns = d.unknowns.map((u) => u.replace('The two main crash-site elevations, two flap times', 'Two flap times'));
  },
  mh370(d) {
    d.sources.push({ id: 's-dca', title: 'Full statement: DCA director general on flight MH370, 29 January 2015', publisher: 'Reproduced by Coconuts KL', year: 2015, url: 'https://coconuts.co/kl/news/full-statement-dca-director-general-flight-mh370/', type: 'news', notes: 'Paragraph 23 presumes all 239 aboard lost.' });
    d.people.sources = [...d.people.sources, 's-dca'];
    (d.conflicts ??= []).push({ about: 'Date the left flap fragment was found', a: 'Table 1.12A, Item 10: 10 May 2016.', b: 'Section 1.12.3, Item 10: 8 May 2016.', sources: ['s1'] });
  },
  twa800(d) {
    const t0 = d.track[0], t2 = d.track[2], t3 = d.track[3];
    Object.assign(t0, { t_utc: '1996-07-18T00:19:56.78Z', lat: 40.619, lon: -73.784, method: t0.method.replace('X=-31.3671, Y=-10.4142', 'X=-31.2459, Y=-10.3706'), locator: t0.locator.replace('00:20:04.48', '00:19:56.78') });
    Object.assign(t2, { t_utc: '1996-07-18T00:21:58.78Z', lat: 40.5159, lon: -73.7372, method: t2.method.replace('X=-29.1916, Y=-16.668', 'X=-29.1518, Y=-16.568'), locator: t2.locator.replace('00:21:58.72', '00:21:58.78') });
    Object.assign(t3, { lon: -73.6591, method: t3.method.replace('X=-25.5838', 'X=-25.5856') });
    const s6 = d.sources.find((s) => s.id === 's6'); if (s6) s6.year = 1997;
    const s7 = d.sources.find((s) => s.id === 's7'); if (s7?.notes) s7.notes = s7.notes.replace('Dated 13 November 1997', 'Dated 30 September 1997');
  },
  stardust(d) { const s = d.sources.find((x) => x.url?.includes('britishaircraft.co.uk')); if (s) Object.assign(s, { title: 'Avro Lancastrian', publisher: 'Wikipedia', year: null, url: 'https://en.wikipedia.org/wiki/Avro_Lancastrian', notes: 'Type dimensions. Replaces a page that no longer resolves.' }); },
};
