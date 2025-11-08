# TESS - Design Guidelines

## Design Approach

**Reference-Based Hybrid**: Drawing inspiration from Khan Academy's clarity, Linear's polished interfaces, and Notion's content organization. The platform must project credibility and sophistication suitable for professional presentations while maintaining learning-focused usability.

**User Note**: When provided UI images are available, those take absolute priority and should be implemented exactly as shown.

---

## Core Design Elements

### Typography System

**Primary Font**: Inter or DM Sans via Google Fonts CDN
- Headlines: 600-700 weight, sizes 32px-48px (text-3xl to text-5xl)
- Subheadings: 600 weight, 20px-24px (text-xl to text-2xl)
- Body: 400-500 weight, 16px (text-base)
- Captions/Metrics: 500 weight, 14px (text-sm)
- Button Text: 500-600 weight, 15px

**Secondary Font**: Source Sans Pro for dense content areas
- Question text: 400 weight, 16px
- Explanations: 400 weight, 15px

### Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Component padding: p-6, p-8
- Section spacing: space-y-8, space-y-12
- Card gaps: gap-6, gap-8
- Container margins: mx-auto with max-w-7xl

**Grid System**:
- Dashboard: 12-column grid for flexible layouts
- Question cards: Single column on mobile, 1-2 columns on tablet+
- Analytics: 3-4 column metric cards on desktop

---

## Component Library

### Navigation
**Top Navigation Bar**:
- Fixed header with subtle shadow (shadow-sm)
- Logo left, navigation center, user profile right
- Height: h-16
- Navigation items with underline indicators for active state
- "Start Practice" CTA button (prominent, rounded-lg)

### Dashboard Components

**Diagnostic Test Cards**:
- Large cards (h-48 to h-64) with test number, description, status
- Progress indicators showing completion percentage
- "Start Test" or "Retake" buttons with icons
- Subtle borders, rounded-xl corners

**Performance Analytics Section**:
- Grid of metric cards (3-4 columns): Questions Answered, Accuracy Rate, Topics Mastered, Study Streak
- Each card: Large number (text-4xl, font-bold), label below (text-sm)
- Padding: p-6
- Background with subtle elevation (shadow-md)

**Topic Breakdown**:
- Horizontal topic pills/tags showing proficiency levels
- Topic name + percentage score
- Visual progress bars beneath each topic
- Arranged in grid format (grid-cols-2 lg:grid-cols-3)

**Progress Chart**:
- Full-width chart container (h-80)
- Clean axes, subtle grid lines
- Use Chart.js or Recharts for professional visualization

### Question Interface

**Question Card**:
- Centered, spacious layout (max-w-3xl)
- Question number and topic tag at top
- Large, readable question text (text-lg)
- Answer options as full-width buttons (h-14, rounded-lg)
- Options have hover states with subtle scale effect
- Spacing between options: space-y-4

**Navigation Controls**:
- Bottom bar with "Previous" and "Next" buttons
- Progress indicator: "Question 5 of 30"
- Submit button (different style, prominent)

### Results & Feedback

**Answer Feedback Cards**:
- Correct answers: subtle success indicator
- Incorrect answers: explanation section with detailed breakdown
- "Try Similar" button for practice
- Padding: p-8, rounded-xl

**Test Results Screen**:
- Hero section with large score display (text-6xl)
- Performance breakdown by topic (visual bars)
- Recommendations section: "Focus Areas" cards with suggested practice
- Retake button at bottom

### Authentication

**Login/Register Forms**:
- Centered card (max-w-md)
- Clean inputs with floating labels
- Height: h-12 per input
- Spacing: space-y-6
- Primary action button: full width, h-12
- OAuth options if using Replit Auth (with icons)

---

## Page Layouts

### Landing/Home (Pre-Login)
- Hero section (h-[600px]) with compelling headline and "Get Started" CTA
- Features grid (3 columns): Diagnostic Tests, Adaptive Practice, Performance Tracking
- Social proof section: testimonials or stats
- Footer with links

### Dashboard (Post-Login)
- Welcome section with user name and quick stats
- Diagnostic tests section (if not completed)
- Daily practice recommendation card
- Performance overview grid
- Recent activity feed

### Practice Session
- Minimal header (just logo and exit)
- Centered question area (no distractions)
- Progress bar at top (h-2, full width)
- Answer options dominate the space
- Bottom navigation controls

### Analytics Page
- Full performance breakdown
- Topic mastery radar chart or similar visualization
- Historical progress line chart
- Detailed statistics table
- Export/share options

---

## Images

**Hero Image**: Modern, diverse students using technology for learning. Abstract geometric patterns or data visualization overlays acceptable. Positioned as background with content overlay.

**Dashboard Illustrations**: Small spot illustrations for empty states ("No tests taken yet", "Start your first practice session") - use illustration libraries like unDraw or Humaaans.

**Icons**: Use Heroicons throughout - outline style for navigation, solid style for metrics and status indicators.

---

## Key UI Patterns

- **Elevation Hierarchy**: Use shadow-sm, shadow-md, shadow-lg sparingly to create depth
- **Rounded Corners**: Consistent use of rounded-lg (8px) for cards, rounded-md (6px) for inputs
- **Micro-interactions**: Subtle scale on hover for interactive elements (scale-105)
- **Loading States**: Skeleton screens for data-heavy sections, spinners for actions
- **Responsive Breakpoints**: Mobile-first, stack on small screens, expand to multi-column on md: and lg:

---

## Accessibility

- All interactive elements have clear focus states (ring-2, ring-offset-2)
- Minimum touch target: h-12 for all buttons
- Form inputs with clear labels and error states
- Adequate color contrast (handled in color phase)
- ARIA labels for icon-only buttons