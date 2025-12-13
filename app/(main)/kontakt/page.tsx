"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send, MessageCircle, Clock } from "lucide-react";

export default function KontaktPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    subject: "general",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "E-Mail",
      value: "kontakt@accelari.com",
      link: "mailto:kontakt@accelari.com"
    },
    {
      icon: Phone,
      title: "Telefon",
      value: "+49 (0) 123 456 789",
      link: "tel:+49123456789"
    },
    {
      icon: MapPin,
      title: "Adresse",
      value: "ACCELARI GmbH, Deutschland",
      link: null
    },
    {
      icon: Clock,
      title: "Erreichbarkeit",
      value: "Mo-Fr: 9:00 - 18:00 Uhr",
      link: null
    }
  ];

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-gray-50 to-white py-16 lg:py-24">
        <div className="s-container text-center">
          <span className="s-badge mb-6">Kontakt</span>
          <h1 className="text-4xl lg:text-5xl font-semibold text-gray-900 mb-6">
            Wir freuen uns auf{" "}
            <span className="text-primary">Ihre Nachricht</span>
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Haben Sie Fragen zu TrademarkIQ oder möchten Sie mehr über unsere Lösungen erfahren? 
            Unser Team hilft Ihnen gerne weiter.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="s-container">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              {submitted ? (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    Vielen Dank für Ihre Nachricht!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden. 
                    In der Regel antworten wir innerhalb von 24 Stunden.
                  </p>
                  <button 
                    onClick={() => setSubmitted(false)}
                    className="s-button"
                  >
                    Neue Nachricht senden
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                        placeholder="Ihr Name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        E-Mail *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                        placeholder="ihre@email.de"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                        Unternehmen
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                        placeholder="Ihr Unternehmen"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                        placeholder="+49 123 456 789"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Betreff *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                    >
                      <option value="general">Allgemeine Anfrage</option>
                      <option value="demo">Demo-Anfrage</option>
                      <option value="enterprise">Enterprise-Anfrage</option>
                      <option value="support">Technischer Support</option>
                      <option value="partnership">Partnerschaft</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Nachricht *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
                      placeholder="Wie können wir Ihnen helfen?"
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="privacy"
                      required
                      className="mt-1"
                    />
                    <label htmlFor="privacy" className="text-sm text-gray-600">
                      Ich habe die <a href="/datenschutz" className="text-primary hover:underline">Datenschutzerklärung</a> gelesen 
                      und stimme der Verarbeitung meiner Daten zu. *
                    </label>
                  </div>

                  <button type="submit" className="s-button w-full md:w-auto">
                    Nachricht senden
                    <Send className="w-4 h-4 ml-2" />
                  </button>
                </form>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Kontaktdaten
                </h3>
                <div className="space-y-4">
                  {contactInfo.map((info, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <info.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{info.title}</div>
                        {info.link ? (
                          <a href={info.link} className="text-gray-600 hover:text-primary transition-colors">
                            {info.value}
                          </a>
                        ) : (
                          <div className="text-gray-600">{info.value}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-primary rounded-xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <MessageCircle className="w-6 h-6" />
                  <h3 className="text-lg font-semibold">
                    Live-Chat
                  </h3>
                </div>
                <p className="text-white/80 text-sm mb-4">
                  Benötigen Sie schnelle Hilfe? Nutzen Sie unseren KI-Sprachassistenten 
                  für sofortige Antworten auf Ihre Fragen.
                </p>
                <a 
                  href="/#voice-assistant" 
                  className="inline-flex items-center text-white font-medium hover:underline"
                >
                  Jetzt sprechen →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
