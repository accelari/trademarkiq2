"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useExperts } from "@/lib/hooks";
import { 
  Handshake, 
  Search, 
  MapPin, 
  Star, 
  Mail, 
  CheckCircle,
  ChevronRight,
  Filter,
  MessageCircle,
  Calendar,
  Loader2,
  X
} from "lucide-react";

export default function ExpertenPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedExpert, setSelectedExpert] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const { experts, isLoading, mutate } = useExperts(searchTerm, selectedLocation);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  
  const [messageForm, setMessageForm] = useState({
    subject: "Allgemeine Anfrage",
    message: ""
  });
  
  const [appointmentForm, setAppointmentForm] = useState({
    preferredDate: "",
    timePreference: "Flexibel",
    description: ""
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const locations = [...new Set(experts.map((e: any) => e.location as string))] as string[];

  const handleSendMessage = async () => {
    if (!selectedExpert) return;
    setContactLoading(true);
    try {
      const res = await fetch(`/api/experts/${selectedExpert.id}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "message",
          subject: messageForm.subject,
          message: messageForm.message
        }),
      });

      if (res.ok) {
        setContactSuccess(true);
        setShowMessageModal(false);
        setMessageForm({ subject: "Allgemeine Anfrage", message: "" });
        setTimeout(() => setContactSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setContactLoading(false);
    }
  };

  const handleSendAppointment = async () => {
    if (!selectedExpert) return;
    setContactLoading(true);
    try {
      const res = await fetch(`/api/experts/${selectedExpert.id}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "appointment",
          preferredDate: appointmentForm.preferredDate,
          timePreference: appointmentForm.timePreference,
          message: appointmentForm.description
        }),
      });

      if (res.ok) {
        setContactSuccess(true);
        setShowAppointmentModal(false);
        setAppointmentForm({ preferredDate: "", timePreference: "Flexibel", description: "" });
        setTimeout(() => setContactSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error sending appointment request:", error);
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Experten-Vermittlung</h1>
        <p className="text-gray-600 mt-1">
          Finden Sie geprüfte Markenanwälte für Ihre Anmeldung
        </p>
      </div>

      <div className="bg-gradient-to-r from-primary to-primary-light rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Nahtlose Übergabe</h2>
            <p className="text-white/80 mt-1">
              Ihre Recherche-Daten werden automatisch an den Experten übermittelt - 
              keine doppelte Arbeit.
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white text-primary rounded-lg font-medium hover:bg-gray-100 transition-colors whitespace-nowrap">
            <MessageCircle className="w-4 h-4" />
            So funktioniert's
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Experten oder Spezialgebiet suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="all">Alle Standorte</option>
            {locations.map((loc: string) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          {experts.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
              <Handshake className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Keine Experten gefunden.</p>
            </div>
          ) : (
            experts.map((expert: any) => (
              <button
                key={expert.id}
                onClick={() => setSelectedExpert(expert)}
                className={`w-full bg-white rounded-xl p-4 sm:p-5 shadow-sm border transition-all text-left ${
                  selectedExpert?.id === expert.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-semibold text-base sm:text-lg flex-shrink-0">
                      {expert.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0 sm:hidden">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{expert.name}</h3>
                        {expert.verified && (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{expert.title}</p>
                      <p className="font-semibold text-gray-900 mt-1">{expert.price}</p>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 hidden sm:block">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{expert.name}</h3>
                      {expert.verified && (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      )}
                      {expert.available ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          Verfügbar
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          Ausgebucht
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{expert.title}</p>
                    <p className="text-sm text-gray-500">{expert.company}</p>
                    
                    <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
                      <span className="flex items-center gap-1 text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {expert.location}
                      </span>
                      <span className="flex items-center gap-1 text-amber-600">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {(expert.rating / 10).toFixed(1)} ({expert.reviewCount} Bewertungen)
                      </span>
                      <span className="text-gray-500">
                        {expert.experience}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {(expert.specialties || []).map((s: string) => (
                        <span key={s} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="font-semibold text-gray-900">{expert.price}</p>
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-auto mt-2" />
                  </div>
                </div>
                
                <div className="mt-3 sm:hidden">
                  <div className="flex items-center gap-2 mb-2">
                    {expert.available ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        Verfügbar
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        Ausgebucht
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{expert.company}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                    <span className="flex items-center gap-1 text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {expert.location}
                    </span>
                    <span className="flex items-center gap-1 text-amber-600">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {(expert.rating / 10).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(expert.specialties || []).slice(0, 3).map((s: string) => (
                      <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="space-y-4 order-1 lg:order-2">
          {selectedExpert ? (
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 lg:sticky lg:top-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-semibold text-xl">
                  {selectedExpert.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedExpert.name}</h3>
                  <p className="text-sm text-gray-500">{selectedExpert.company}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Sprachen</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedExpert.languages || []).map((lang: string) => (
                      <span key={lang} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Spezialgebiete</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedExpert.specialties || []).map((s: string) => (
                      <span key={s} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {contactSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    Anfrage wurde erfolgreich gesendet!
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <button 
                    onClick={() => setShowAppointmentModal(true)}
                    disabled={!selectedExpert.available}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    <Calendar className="w-4 h-4" />
                    Termin vereinbaren
                  </button>
                  <button 
                    onClick={() => setShowMessageModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Nachricht senden
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <Handshake className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                Wählen Sie einen Experten aus, um Details zu sehen
              </p>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-5">
            <h4 className="font-semibold text-gray-900 mb-2">Warum einen Experten?</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Rechtssichere Anmeldung durch Profis</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Schnellere Bearbeitung durch Erfahrung</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Beratung zu Schutzumfang und Strategie</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Vertretung bei Widersprüchen</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => setShowMessageModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Nachricht an {selectedExpert?.name}</h3>
              <button 
                onClick={() => setShowMessageModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Betreff</label>
                <select
                  value={messageForm.subject}
                  onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                >
                  <option value="Allgemeine Anfrage">Allgemeine Anfrage</option>
                  <option value="Beratungstermin">Beratungstermin</option>
                  <option value="Kostenvoranschlag">Kostenvoranschlag</option>
                  <option value="Markenrecherche">Markenrecherche</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ihre Nachricht</label>
                <textarea
                  value={messageForm.message}
                  onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                  placeholder="Beschreiben Sie Ihr Anliegen..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSendMessage}
                disabled={contactLoading || !messageForm.message.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {contactLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Senden
              </button>
            </div>
          </div>
        </div>
      )}

      {showAppointmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => setShowAppointmentModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Termin mit {selectedExpert?.name}</h3>
              <button 
                onClick={() => setShowAppointmentModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gewünschtes Datum</label>
                <input
                  type="date"
                  value={appointmentForm.preferredDate}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, preferredDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zeitpräferenz</label>
                <select
                  value={appointmentForm.timePreference}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, timePreference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                >
                  <option value="Vormittags (9-12 Uhr)">Vormittags (9-12 Uhr)</option>
                  <option value="Nachmittags (13-17 Uhr)">Nachmittags (13-17 Uhr)</option>
                  <option value="Flexibel">Flexibel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kurze Beschreibung</label>
                <textarea
                  value={appointmentForm.description}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, description: e.target.value })}
                  placeholder="Worum geht es bei dem Termin?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowAppointmentModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSendAppointment}
                disabled={contactLoading || !appointmentForm.preferredDate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {contactLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                Anfragen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
