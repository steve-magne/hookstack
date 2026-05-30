# Skill Detail Page

## 1. Overview

This document specifies the design for the Skill Detail Page, focusing on presenting information about a specific AI skill, "Humanizer." The page aims to inform users about the skill's functionality and provide clear calls to action.

## 2. Experience Goals

*   **Inform:** Clearly present the skill's features and benefits.
*   **Engage:** Encourage users to explore related content or actions.
*   **Actionable:** Provide prominent options to interact with the skill (e.g., copy prompt, download).

## 3. Information Architecture

*   **Header:** Brand logo and navigation back to the store.
*   **Hero:** Skill title, version, status (e.g., FREE), and a concise description.
*   **Main Content:** Detailed skill description, usage instructions, and related links.
*   **Sidebar:** (Inferred) Potentially related links or external resources.
*   **Footer:** (Not detected, confirm design decision)

## 4. Layout System

The page utilizes a combination of CSS Grid and Flexbox for layout.

*   **Desktop:** A two-column grid (`grid-template-columns: 300px 1fr`) is used for the main content area, likely for a sidebar and primary content.
*   **Mobile:** Layouts adapt using `@media (max-width: 768px)`, likely collapsing to a single column or adjusting padding.
*   **Alignment:** Elements are frequently `align-items: center` or `flex-start`, with `justify-content: space-between` or `center` for distribution.

## 5. Section-by-Section Design Spec

### 5.1. Header

*   **Content:** "FlowOS" brand link, "Retour au store" link.
*   **Layout:** `display: flex`, `align-items: center`, `justify-content: space-between`.
*   **Padding:** `20px 56px` (desktop), `16px 20px` (mobile).

### 5.2. Hero Section

*   **Content:** H1 "Humanizer", version (e.g., "v1.0"), status (e.g., "FREE"), and a descriptive paragraph.
*   **Components:** Pill-shaped tags for version/status.

### 5.3. Main Content Area

*   **Content:** Detailed description of the skill, including how it builds a voice profile.
*   **Components:** Action buttons ("Copier le prompt", "Télécharger .zip").
*   **Related Content:** "Pour aller plus loin" section with links to "Réserver un diagnostic" and "YouTube".

## 6. Component Inventory

*   **Buttons:** Primary action buttons.
*   **Pills:** Small, rounded tags for metadata.
*   **Cards:** Used for grouping related content, e.g., "Pour aller plus loin."
*   **Links:** Standard text links.

## 7. Visual Design Specification

### 7.1. Design System Tokens

*   **Colors:**
*   `--color-white`: `#FFFFFF`, `#fff`
*   `--color-gray-dark`: `#3A3A3C`, `#1c1c1e`
*   `--color-gray-medium`: `#8E8E93`, `#a2aaad`
*   `--color-gray-light`: `#D1D1D6`
*   `--color-black`: `#000`
*   **Transparencies:** `--color-gray-dark-8f`: `#1c1c1e8f`, `--color-gray-dark-b3`: `#3a3a3cb3`, `--color-black-06`: `#0006`, `--color-gray-dark-66`: `#3a3a3c66`, `--color-white-0a`: `#ffffff0a`, `--color-white-2e`: `#ffffff2e`, `--color-black-8c`: `#0000008c`, `--color-gray-dark-d9`: `#3a3a3cd9`, `--color-gray-dark-8c`: `#3a3a3c8c`, `--color-gray-medium-21`: `#a2aaad21`, `--color-gray-medium-1a`: `#8e8e931a`, `--color-black-0a`: `#0a0a0a`, `--color-black-16`: `#16161a`, `--color-black-0c`: `#0a0a0c`, `--color-gray-dark-73`: `#3a3a3c73`
*   **Shadows:**
*   `--shadow-glass`: `var(--fos-glass-shadow)` (confirm exact values)
*   `--shadow-accent-outline`: `0 0 0 4px var(--fos-accent)15`
*   `--shadow-card`: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`
*   **Border Radius:**
*   `--radius-pill`: `999px`
*   `--radius
