import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageSquare, MapPin, ShieldCheck } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="sunrise-footer">
      <div className="footer-container">
        <div className="footer-col">
          <h4>NEED HELP?</h4>
          <ul>
            <li><Link to="/tracking">Track Your Order</Link></li>
            <li><Link to="/cart">Shipping & Delivery</Link></li>
            <li><Link to="/contact">Contact Support</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>BOOKCONNECT</h4>
          <ul>
            <li><Link to="/">About Our Bookstore</Link></li>
            <li><Link to="/catalog">Browse Catalog</Link></li>
            <li><Link to="/orders">My Account & Orders</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>SERVICES</h4>
          <ul>
            <li><span>Academic Book Sourcing</span></li>
            <li><span>Corporate & Bulk Orders</span></li>
            <li><span>Instant Delivery Tracking</span></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>PAYMENTS & CONTACT</h4>
          <p><Phone size={14} /> Hotline: <strong>0725333939</strong></p>
          <p><MessageSquare size={14} /> WhatsApp: <strong>+254 725 333 939</strong></p>
          <p><MapPin size={14} /> Nairobi, Kenya</p>
          <div className="mpesa-badge-box">
            <span>LIPA NA M-PESA</span>
            <strong>Till: 333939</strong>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 BookConnect. All rights reserved. Designed for Excellence.</p>
      </div>
    </footer>
  );
};

export default Footer;