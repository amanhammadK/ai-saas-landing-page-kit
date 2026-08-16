# AI SaaS Landing Page Kit

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version 1.0.0"/>
  <img src="https://img.shields.io/badge/next.js-14.0+-black.svg" alt="Next.js 14.0+"/>
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT License"/>
  <img src="https://img.shields.io/badge/react-18.2+-blue.svg" alt="React 18.2+"/>
</p>

A beautiful, high-conversion landing page kit for AI SaaS products. Built with Next.js, this template provides a modern, responsive, and SEO-optimized foundation for your AI product's marketing site.

## What's Included

- Next.js 14 with App Router
- Responsive landing page layout with header and feature sections
- Dark mode ready design system
- SEO-optimized meta tags and semantic HTML
- ESLint + Prettier for code quality
- Jest + React Testing Library for testing
- Docker multi-stage build with health checks
- CI/CD pipeline via GitHub Actions

## Features

- **Modern Design**: Clean, professional layout optimized for AI SaaS products
- **Responsive**: Fully responsive design that works on all devices
- **Dark Mode Ready**: CSS variable-based theming for dark/light mode support
- **SEO Optimized**: Semantic HTML structure and meta tags for search engines
- **High Conversion**: Strategic call-to-action placement and feature highlights
- **Performance**: Next.js optimized images and static generation
- **Accessibility**: ARIA-compliant components and keyboard navigation
- **Code Quality**: ESLint + Prettier enforced standards
- **Dockerized**: Multi-stage Dockerfile with HEALTHCHECK
- **CI/CD Ready**: GitHub Actions workflow

## Quick Start

### Prerequisites

- Node.js 20 or higher
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/amanhammadK/ai-saas-landing-page-kit.git
cd ai-saas-landing-page-kit

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Testing

```bash
# Run test suite
npm test
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
ai-saas-landing-page-kit/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── app/
│   ├── layout.js               # Root layout with metadata
│   └── page.js                 # Main landing page
├── __tests__/
│   └── page.test.js            # Landing page tests
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── .prettierrc                # Prettier configuration
├── Dockerfile                 # Multi-stage Docker build
├── eslint.config.js           # ESLint configuration
├── jest.config.js             # Jest configuration
├── package.json               # Project dependencies
└── README.md                  # This file
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_APP_URL` | Public URL of the application | No |
| `CONTACT_EMAIL` | Email address for contact forms | No |

### Customizing the Landing Page

Edit `app/page.js` to:

- Update hero section headline and subtext
- Add feature cards with your product details
- Modify color scheme and typography
- Add pricing section, testimonials, or FAQ
- Integrate analytics and tracking

## Deployment

### Docker

```bash
# Build the image
docker build -t ai-saas-landing-page .

# Run the container
docker run -p 3000:3000 ai-saas-landing-page
```

### Vercel (Recommended)

```bash
npm install -g vercel
vercel --prod
```

### Other Platforms

- **Netlify**: Connect repo, set build to `npm run build`, publish `.next`
- **Cloudflare Pages**: Configure build command and output directory
- **AWS Amplify**: Set framework to Next.js

## Development Guide

### Adding a Section

```javascript
export default function PricingSection() {
    return (
        <section id="pricing">
            <h2>Pricing Plans</h2>
            <div className="pricing-grid">
                {/* Pricing cards here */}
            </div>
        </section>
    );
}
```

### Styling Guidelines

- Use CSS modules or inline styles as shown in the template
- Leverage CSS custom properties for theming
- Follow the existing grid and spacing conventions

### Code Style

- ESLint with Next.js and Prettier configs
- Run `npm run lint` before committing
- Write tests for new components

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with Next.js and ❤️
</p>