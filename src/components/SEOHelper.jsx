import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function SEOHelper({ title, description, canonical }) {
  const location = useLocation();

  useEffect(() => {
    // Update Title
    const baseTitle = 'QConnect — Smart Cafe Management';
    document.title = title ? `${title} | ${baseTitle}` : baseTitle;

    // Update Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute(
      'content',
      description || 'Manage restaurant menus, tables, digital ordering, and reviews with QConnect.'
    );

    // Update Canonical URL
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    const targetCanonical = canonical || `https://qconnecthub.netlify.app${location.pathname}`;
    linkCanonical.setAttribute('href', targetCanonical);
  }, [title, description, canonical, location]);

  return null;
}
