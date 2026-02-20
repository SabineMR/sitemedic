'use client';

/**
 * Step 1: Client Details
 * Phase 34.1: Self-Procured Jobs — Plan 02
 *
 * Allows the user to either select an existing client or enter new client details.
 * Includes: client name, contact person, email, phone, and address fields.
 */

import { useEffect, useState } from 'react';
import { useDirectJobStore } from '@/stores/useDirectJobStore';

interface ClientOption {
  id: string;
  client_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postcode: string | null;
}

interface Props {
  errors?: Record<string, string[] | undefined>;
}

export default function ClientDetailsStep({ errors }: Props) {
  const store = useDirectJobStore();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [isNewClient, setIsNewClient] = useState(!store.existing_client_id);

  // Fetch existing clients on mount
  useEffect(() => {
    fetch('/api/direct-jobs/clients')
      .then((res) => res.json())
      .then((data) => {
        setClients(data.clients || []);
        setLoadingClients(false);
      })
      .catch(() => {
        setLoadingClients(false);
      });
  }, []);

  const handleSelectClient = (clientId: string) => {
    if (!clientId) {
      store.setExistingClient(null);
      setIsNewClient(true);
      return;
    }
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      store.setExistingClient(client);
      setIsNewClient(false);
    }
  };

  const handleNewClient = () => {
    store.setExistingClient(null);
    setIsNewClient(true);
  };

  return (
    <div className="space-y-6">
      {/* Existing Client Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Client
        </label>
        <div className="flex gap-3 mb-4">
          <button
            type="button"
            onClick={handleNewClient}
            className={`rounded-md px-4 py-2 text-sm font-medium border ${
              isNewClient
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            New Client
          </button>
          <button
            type="button"
            onClick={() => setIsNewClient(false)}
            disabled={clients.length === 0}
            className={`rounded-md px-4 py-2 text-sm font-medium border ${
              !isNewClient
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            } disabled:opacity-50`}
          >
            Existing Client
          </button>
        </div>

        {!isNewClient && (
          <div className="mb-4">
            <select
              value={store.existing_client_id || ''}
              onChange={(e) => handleSelectClient(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a client...</option>
              {loadingClients ? (
                <option disabled>Loading clients...</option>
              ) : (
                clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.client_name}
                    {client.contact_name ? ` (${client.contact_name})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        )}
      </div>

      {/* Client Name */}
      <div>
        <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1">
          Client / Organisation Name <span className="text-red-500">*</span>
        </label>
        <input
          id="client_name"
          type="text"
          value={store.client_name}
          onChange={(e) => store.updateField('client_name', e.target.value)}
          disabled={!isNewClient && !!store.existing_client_id}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          placeholder="e.g. Festival Productions Ltd"
        />
        {errors?.client_name && (
          <p className="mt-1 text-sm text-red-600">{errors.client_name[0]}</p>
        )}
      </div>

      {/* Contact Name */}
      <div>
        <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 mb-1">
          Contact Person
        </label>
        <input
          id="contact_name"
          type="text"
          value={store.contact_name}
          onChange={(e) => store.updateField('contact_name', e.target.value)}
          disabled={!isNewClient && !!store.existing_client_id}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          placeholder="e.g. John Smith"
        />
      </div>

      {/* Contact Email & Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
            Contact Email
          </label>
          <input
            id="contact_email"
            type="email"
            value={store.contact_email}
            onChange={(e) => store.updateField('contact_email', e.target.value)}
            disabled={!isNewClient && !!store.existing_client_id}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="john@example.com"
          />
          {errors?.contact_email && (
            <p className="mt-1 text-sm text-red-600">{errors.contact_email[0]}</p>
          )}
        </div>
        <div>
          <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
            Contact Phone
          </label>
          <input
            id="contact_phone"
            type="tel"
            value={store.contact_phone}
            onChange={(e) => store.updateField('contact_phone', e.target.value)}
            disabled={!isNewClient && !!store.existing_client_id}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="07700 900000"
          />
        </div>
      </div>

      {/* Address Fields */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Client Address</h3>
        <div>
          <label htmlFor="address_line_1" className="block text-xs text-gray-500 mb-1">
            Address Line 1
          </label>
          <input
            id="address_line_1"
            type="text"
            value={store.address_line_1}
            onChange={(e) => store.updateField('address_line_1', e.target.value)}
            disabled={!isNewClient && !!store.existing_client_id}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="123 High Street"
          />
        </div>
        <div>
          <label htmlFor="address_line_2" className="block text-xs text-gray-500 mb-1">
            Address Line 2
          </label>
          <input
            id="address_line_2"
            type="text"
            value={store.address_line_2}
            onChange={(e) => store.updateField('address_line_2', e.target.value)}
            disabled={!isNewClient && !!store.existing_client_id}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-xs text-gray-500 mb-1">
              City
            </label>
            <input
              id="city"
              type="text"
              value={store.city}
              onChange={(e) => store.updateField('city', e.target.value)}
              disabled={!isNewClient && !!store.existing_client_id}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="London"
            />
          </div>
          <div>
            <label htmlFor="postcode" className="block text-xs text-gray-500 mb-1">
              Postcode
            </label>
            <input
              id="postcode"
              type="text"
              value={store.postcode}
              onChange={(e) => store.updateField('postcode', e.target.value.toUpperCase())}
              disabled={!isNewClient && !!store.existing_client_id}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="SW1A 1AA"
            />
            {errors?.postcode && (
              <p className="mt-1 text-sm text-red-600">{errors.postcode[0]}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
