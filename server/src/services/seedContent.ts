/** Website content seed: settings, sample projects + units, progress, testimonials. Never creates users or payments. */
import { ConstructionProgress, Flat, Project, Testimonial, WebsiteSettings, defaultStages } from "../models";
import { CONSTRUCTION_STAGES } from "../types";

const img = (id: string, caption?: string) => ({ url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1800&q=80`, caption });
const taka = (n: number) => Math.round(n * 100);

const projects = [
  {
    name: "Arkhaven Meridian",
    slug: "arkhaven-meridian",
    tagline: "Twelve storeys of south-facing family homes on Bashundhara's quiet side.",
    description:
      "Arkhaven Meridian rises on a 10-katha corner plot on Road 7, Block G, Bashundhara R/A. Four homes per floor are arranged around a central light well so every apartment gets cross-ventilation and morning sun. The structure is a reinforced concrete frame on cast-in-situ piles, designed to BNBC 2020 seismic requirements.\n\nResidents share a rooftop garden with a covered prayer pavilion, a children's play deck and a double-height lobby with reception. Two basements provide one dedicated parking bay per apartment plus visitor spaces.",
    type: "residential",
    status: "ongoing",
    featured: true,
    sortOrder: 1,
    location: {
      address: "Plot 412, Road 7, Block G, Bashundhara R/A, Dhaka 1229",
      area: "Bashundhara R/A",
      city: "Dhaka",
      lat: 23.8193,
      lng: 90.4526,
    },
    coverImage: img("1515263487990-61b07816b324", "Front elevation"),
    gallery: [
      img("1515263487990-61b07816b324", "Front elevation"),
      img("1600607687939-ce8a6c25118c", "Living room, typical floor"),
      img("1484154218962-a197022b5858", "Kitchen with service balcony"),
      img("1505693416388-ac5ce068fe85", "Master bedroom"),
      img("1600210492486-724fe5c67fb0", "Family lounge"),
    ],
    floorPlans: [
      { title: "Type A, South corner", sizeSqft: 2100, bedrooms: 4, bathrooms: 4 },
      { title: "Type B, South", sizeSqft: 1850, bedrooms: 3, bathrooms: 3 },
      { title: "Type C, North", sizeSqft: 1650, bedrooms: 3, bathrooms: 3 },
    ],
    amenities: ["Rooftop garden", "Prayer pavilion", "Children's play deck", "Double-height lobby", "Two passenger lifts", "Stretcher lift", "Full generator backup", "Substation", "Fire detection & sprinklers", "24/7 CCTV & security", "Gas connection (Titas)", "Water treatment plant"],
    facilities: ["Two basements, 1 bay per unit", "Visitor parking", "Reception & concierge", "Community hall (rooftop)", "Driver's waiting room", "Intercom to every unit"],
    specs: { landArea: "10 katha", totalFloors: 13, floorsLabel: "2B + G + 12", unitsPerFloor: 4, parking: "1 per apartment", frontRoad: "40 ft", structure: "RCC frame, BNBC 2020", typicalSizeSqft: "1,650 to 2,100 sft", bedrooms: 3, bathrooms: 3 },
    construction: { architect: "Studio Nodi Architects", engineer: "Structural: R. Hasan & Associates", contractor: "Arkhaven Construction Unit", startedAt: new Date("2025-02-01"), foundation: "Cast-in-situ bored piles, 24 m depth", materials: "BSRM 500W rebar, Shah/Seven Rings cement, auto-bricks" },
    priceFromMinor: taka(19800000),
    expectedCompletion: new Date("2027-12-31"),
    faqs: [
      { q: "When is handover planned?", a: "The target handover is December 2027. Live progress is published in the customer portal and on this page." },
      { q: "Is the land registered and mutated?", a: "Yes. The land is registered in the landowner's name with completed mutation, and RAJUK plan approval is in hand. Copies are shared with buyers before booking." },
      { q: "What is the payment schedule?", a: "Booking money, a down payment at agreement, then installments tied to construction milestones. Your advisor will share the full schedule for your unit." },
    ],
    flats: { floors: [1, 12], units: [{ suffix: "A", sizeSqft: 2100, bedrooms: 4, bathrooms: 4, balconies: 3, facing: "South-East", rate: 12000 }, { suffix: "B", sizeSqft: 1850, bedrooms: 3, bathrooms: 3, balconies: 3, facing: "South", rate: 11800 }, { suffix: "C", sizeSqft: 1650, bedrooms: 3, bathrooms: 3, balconies: 2, facing: "North", rate: 11400 }, { suffix: "D", sizeSqft: 1650, bedrooms: 3, bathrooms: 3, balconies: 2, facing: "North-West", rate: 11400 }] },
    progress: { stage: 4, percent: 41, handover: new Date("2027-12-31") },
  },
  {
    name: "Lintel Court",
    slug: "lintel-court",
    tagline: "Compact, light-filled three-bedroom homes a short walk from Uttara Sector 13 park.",
    description:
      "Lintel Court is a nine-storey residence on a 6-katha plot in Uttara Sector 13, facing a 30 ft road and two minutes on foot from the sector park. Three apartments per floor keep the building intimate, and deep shaded balconies cut afternoon heat without blocking the view.\n\nThe project is currently in approval and pre-booking. Early buyers choose their floor and finish palette before structural work begins.",
    type: "residential",
    status: "upcoming",
    featured: true,
    sortOrder: 2,
    location: { address: "House 18, Road 9, Sector 13, Uttara, Dhaka 1230", area: "Uttara", city: "Dhaka", lat: 23.8733, lng: 90.3914 },
    coverImage: img("1479839672679-a46483c0e7c8", "Concept elevation"),
    gallery: [img("1479839672679-a46483c0e7c8", "Concept elevation"), img("1522708323590-d24dbb6b0267", "Living and dining"), img("1560448204-e02f11c3d0e2", "Lounge with balcony"), img("1502672260266-1c1ef2d93688", "Reading corner")],
    floorPlans: [{ title: "Type A, East", sizeSqft: 1380, bedrooms: 3, bathrooms: 3 }, { title: "Type B, West", sizeSqft: 1290, bedrooms: 3, bathrooms: 2 }],
    amenities: ["Rooftop terrace", "Passenger lift", "Generator backup", "CCTV", "Gas connection", "Deep shaded balconies"],
    facilities: ["Ground-floor parking", "Guard room", "Intercom"],
    specs: { landArea: "6 katha", totalFloors: 9, floorsLabel: "G + 9", unitsPerFloor: 3, parking: "1 per apartment (limited)", frontRoad: "30 ft", structure: "RCC frame, BNBC 2020", typicalSizeSqft: "1,290 to 1,380 sft", bedrooms: 3, bathrooms: 3 },
    construction: { architect: "Studio Nodi Architects", foundation: "Pile foundation (design stage)" },
    priceFromMinor: taka(12900000),
    expectedCompletion: new Date("2029-06-30"),
    faqs: [{ q: "Can I book now?", a: "Yes. Pre-booking is open with a refundable booking amount until RAJUK approval is received." }],
    flats: { floors: [1, 9], units: [{ suffix: "A", sizeSqft: 1380, bedrooms: 3, bathrooms: 3, balconies: 2, facing: "East", rate: 10200 }, { suffix: "B", sizeSqft: 1290, bedrooms: 3, bathrooms: 2, balconies: 2, facing: "West", rate: 9900 }, { suffix: "C", sizeSqft: 1290, bedrooms: 3, bathrooms: 2, balconies: 2, facing: "North", rate: 9800 }] },
    progress: { stage: 0, percent: 4, handover: new Date("2029-06-30") },
  },
  {
    name: "Kadamba Residences",
    slug: "kadamba-residences",
    tagline: "A completed garden building in Sylhet's Uposhohor, handed over on schedule.",
    description:
      "Kadamba Residences is a seven-storey building of fourteen large apartments around a landscaped courtyard planted with kadam trees. It was completed in 2025 and handed over to its owners within the committed timeline. Two apartments remain for sale.",
    type: "residential",
    status: "completed",
    featured: false,
    sortOrder: 3,
    location: { address: "Block D, Road 3, Uposhohor, Sylhet 3100", area: "Uposhohor, Sylhet", city: "Sylhet", lat: 24.8869, lng: 91.8851 },
    coverImage: img("1574362848149-11496d93a7c7", "Completed building"),
    gallery: [img("1574362848149-11496d93a7c7", "Completed building"), img("1493809842364-78817add7ffb", "Show apartment"), img("1618221195710-dd6b41faaea6", "Family room")],
    floorPlans: [{ title: "Courtyard type", sizeSqft: 1950, bedrooms: 4, bathrooms: 3 }],
    amenities: ["Landscaped courtyard", "Lift", "Generator", "CCTV", "Rooftop BBQ deck"],
    facilities: ["Ground-floor parking", "Caretaker apartment", "Community room"],
    specs: { landArea: "8 katha", totalFloors: 7, floorsLabel: "G + 7", unitsPerFloor: 2, parking: "1 per apartment", frontRoad: "25 ft", structure: "RCC frame", typicalSizeSqft: "1,950 sft", bedrooms: 4, bathrooms: 3 },
    construction: { contractor: "Arkhaven Construction Unit", startedAt: new Date("2022-03-01") },
    priceFromMinor: taka(15600000),
    expectedCompletion: new Date("2025-08-31"),
    faqs: [],
    flats: { floors: [6, 7], units: [{ suffix: "A", sizeSqft: 1950, bedrooms: 4, bathrooms: 3, balconies: 3, facing: "South", rate: 8200 }] },
    progress: { stage: 10, percent: 100, handover: new Date("2025-08-31") },
  },
  {
    name: "Arkhaven Exchange",
    slug: "arkhaven-exchange",
    tagline: "Column-free office floors on Tejgaon's commercial spine.",
    description:
      "Arkhaven Exchange is a fourteen-storey commercial building on Tejgaon–Gulshan Link Road with column-free floor plates of about 6,200 sft that can be taken whole or split into two suites. The façade uses double-glazed units with external fins to reduce cooling loads, and the core houses four high-speed lifts and a dedicated goods lift.",
    type: "commercial",
    status: "ongoing",
    featured: true,
    sortOrder: 4,
    location: { address: "Plot 9, Tejgaon I/A, Tejgaon–Gulshan Link Road, Dhaka 1208", area: "Tejgaon", city: "Dhaka", lat: 23.7726, lng: 90.4057 },
    coverImage: img("1582407947304-fd86f028f716", "Tower concept"),
    gallery: [img("1582407947304-fd86f028f716", "Tower concept"), img("1497366811353-6870744d04b2", "Typical office floor"), img("1486406146926-c627a92ad1ab", "Façade detail")],
    floorPlans: [{ title: "Full floor", sizeSqft: 6200 }, { title: "Half floor suite", sizeSqft: 3050 }],
    amenities: ["4 high-speed lifts", "Goods lift", "Central chiller plant", "100% generator backup", "Fire sprinklers & hydrants", "Access control", "BMS"],
    facilities: ["3 basements parking", "Food court (level 2)", "Prayer rooms", "Ground-floor retail"],
    specs: { landArea: "1 bigha", totalFloors: 17, floorsLabel: "3B + G + 14", unitsPerFloor: 2, parking: "Allocated per suite", frontRoad: "100 ft", structure: "RCC core & flat slab, BNBC 2020", typicalSizeSqft: "3,050 to 6,200 sft" },
    construction: { contractor: "Arkhaven Construction Unit", startedAt: new Date("2025-09-01"), foundation: "Raft on piles" },
    priceFromMinor: taka(55000000),
    expectedCompletion: new Date("2028-12-31"),
    faqs: [],
    flats: { floors: [2, 14], units: [{ suffix: "E", sizeSqft: 3050, bedrooms: 0, bathrooms: 2, balconies: 0, facing: "East", rate: 18500 }, { suffix: "W", sizeSqft: 3150, bedrooms: 0, bathrooms: 2, balconies: 0, facing: "West", rate: 18000 }] },
    progress: { stage: 2, percent: 18, handover: new Date("2028-12-31") },
  },
] as const;

const settings = {
  key: "main",
  companyName: "Arkhaven Properties Ltd.",
  announcementBar: "Pre-booking is open for Lintel Court, Uttara. Speak to an advisor this week.",
  hero: {
    eyebrow: "Residential and commercial developer in Dhaka and Sylhet",
    title: "Homes built with care, handed over with trust.",
    subtitle: "Arkhaven designs and builds apartments where the paperwork is clear, the progress is visible, and the handover date means something.",
    image: { url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=2400&q=80" },
    primaryCtaLabel: "Explore projects",
    secondaryCtaLabel: "Book a site visit",
  },
  about: {
    eyebrow: "About Arkhaven",
    title: "A developer you can follow from the first pile to the last key.",
    body: "Arkhaven Properties was founded in 2014 by a civil engineer and an architect who were tired of buyers being kept in the dark. We build fewer buildings, on carefully vetted land, and we publish what is happening on site every month.\n\nEvery buyer receives a personal portal with their unit, payment ledger, receipts and construction photographs, so the answer to \"how is my home coming along?\" is always one tap away.",
    image: { url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80" },
    mission: "To build durable, well-planned homes and workplaces, and to keep every buyer informed with honest, verifiable progress from booking to handover.",
    vision: "To be the developer families in Bangladesh recommend first because we did exactly what we promised.",
    points: ["Land titles vetted by independent counsel", "Milestone-linked payment schedules", "Monthly photo updates in your portal", "Structural design to BNBC 2020"],
  },
  values: [
    { title: "Clarity", body: "Documents, prices and timelines in writing, before you pay a taka." },
    { title: "Craft", body: "Engineering-led design, tested materials and supervised workmanship." },
    { title: "Accountability", body: "Named project managers and a published progress record for every site." },
    { title: "Care", body: "Advisors who help you choose the right home, not just the most expensive one." },
  ],
  whyUs: [
    { title: "Verified land and approvals", body: "Every plot is title-searched and mutated, and plan approvals are shared with buyers before booking." },
    { title: "Progress you can see", body: "Stage-by-stage construction tracking and site photographs in your personal portal." },
    { title: "Transparent payments", body: "A live ledger of every installment with downloadable receipts the moment a payment is verified." },
    { title: "Engineered to last", body: "Pile foundations, BNBC 2020 seismic design and third-party material testing on every project." },
  ],
  stats: [
    { label: "Years building", value: "12" },
    { label: "Homes handed over", value: "340+" },
    { label: "Projects delivered", value: "9" },
    { label: "On-time handovers", value: "100%" },
  ],
  team: [
    { name: "Engr. Tanvir Alam", role: "Managing Director", bio: "Structural engineer (BUET). Two decades in high-rise construction." },
    { name: "Ar. Nusrat Jahan", role: "Director, Design", bio: "Architect leading planning, façades and interior standards." },
    { name: "Faisal Rahman", role: "Head of Sales & Customer Care", bio: "Runs the advisor team and the handover desk." },
    { name: "Engr. Shirin Akter", role: "Head of Construction", bio: "Oversees site quality, safety and the monthly progress record." },
  ],
  milestones: [
    { year: "2014", title: "Founded in Dhaka", body: "First joint-venture project in Mirpur DOHS." },
    { year: "2018", title: "Expanded to Sylhet", body: "First project outside Dhaka." },
    { year: "2022", title: "Customer portal launched", body: "Every buyer gets live payment and progress tracking." },
    { year: "2025", title: "Kadamba Residences handed over", body: "Delivered on schedule to 14 families." },
  ],
  contact: {
    phone: "+880 1711-000000",
    email: "hello@arkhaven.example",
    whatsapp: "8801711000000",
    address: "Level 6, Arkhaven House, 23 Kemal Ataturk Avenue, Banani, Dhaka 1213",
    officeHours: "Saturday to Thursday, 10:00 to 19:00",
    mapEmbedUrl: "",
  },
  social: { facebook: "", instagram: "", linkedin: "", youtube: "" },
  seo: { title: "Arkhaven Properties | Apartments & Commercial Spaces in Dhaka and Sylhet", description: "Arkhaven Properties builds residential and commercial projects in Dhaka and Sylhet with verified land, milestone-linked payments and live construction tracking." },
};

const testimonials = [
  { name: "Sharmin & Imran H.", role: "Owners, Kadamba Residences", quote: "We were abroad for most of the construction. The monthly photos and the payment ledger meant we never had to chase anyone for an update.", rating: 5, sortOrder: 1 },
  { name: "Dr. Mahmudul Karim", role: "Buyer, Arkhaven Meridian", quote: "The advisor talked me out of a bigger unit I did not need. That honesty is why I booked.", rating: 5, sortOrder: 2 },
  { name: "Rubaiya Chowdhury", role: "Landowner partner", quote: "Clear agreement, clear timeline, and they kept us informed at every approval stage.", rating: 5, sortOrder: 3 },
];

export async function seedContent(force = false): Promise<string[]> {
  const log: string[] = [];

  const existingSettings = await WebsiteSettings.findOne({ key: "main" });
  if (!existingSettings) {
    await WebsiteSettings.create(settings);
    log.push("✓ website settings created");
  } else if (force) {
    existingSettings.set(settings);
    await existingSettings.save();
    log.push("✓ website settings overwritten");
  }

  const ids: unknown[] = [];
  for (const p of projects) {
    const { flats, progress, ...data } = p;
    let doc = await Project.findOne({ slug: p.slug });
    if (doc && !force) {
      ids.push(doc._id);
      continue;
    }
    if (doc) doc.set(data);
    else doc = new Project(data);
    await doc.save();
    ids.push(doc._id);

    const existingFlats = await Flat.countDocuments({ project: doc._id });
    if (existingFlats === 0) {
      const docs = [];
      for (let floor = flats.floors[0]; floor <= flats.floors[1]; floor++) {
        for (const u of flats.units) {
          // Higher floors carry a small premium, as is common in Dhaka pricing.
          const rate = u.rate + (floor - flats.floors[0]) * 50;
          docs.push({ project: doc._id, unitNumber: `${floor}${u.suffix}`, floor, sizeSqft: u.sizeSqft, bedrooms: u.bedrooms, bathrooms: u.bathrooms, balconies: u.balconies, facing: u.facing, parking: true, priceMinor: taka(u.sizeSqft * rate), status: "available" });
        }
      }
      await Flat.insertMany(docs);
    }

    const stages = defaultStages().map((s) => ({
      ...s,
      status: s.key < progress.stage || (s.key === progress.stage && s.key === CONSTRUCTION_STAGES.length - 1) ? "completed" : s.key === progress.stage ? "in_progress" : "pending",
    }));
    await ConstructionProgress.findOneAndUpdate(
      { project: doc._id },
      {
        $set: { currentStage: progress.stage, percent: progress.percent, expectedHandover: progress.handover, stages },
        $setOnInsert: {
          updates: [{ title: `Current stage: ${CONSTRUCTION_STAGES[progress.stage]}`, description: "Progress record initialised.", stageKey: progress.stage, percent: progress.percent, createdAt: new Date() }],
        },
      },
      { upsert: true },
    );
    log.push(`✓ project ${p.name}`);
  }

  if ((await Testimonial.countDocuments()) === 0) {
    await Testimonial.insertMany(testimonials.map((t, i) => ({ ...t, project: i === 0 ? ids[2] : i === 1 ? ids[0] : undefined })));
    log.push("✓ testimonials");
  }

  const s = await WebsiteSettings.findOne({ key: "main" });
  if (s && (!s.featuredProjectIds || s.featuredProjectIds.length === 0)) {
    s.featuredProjectIds = [ids[0], ids[1], ids[3]] as typeof s.featuredProjectIds;
    await s.save();
  }
  return log;
}

