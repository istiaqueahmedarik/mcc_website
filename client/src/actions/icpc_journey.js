const getBaseUrl = () => {
  const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL;
  if (!base) return null;
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

export async function getIcpcJourneyPublic() {
  const base = getBaseUrl();
  if (!base) {
    return { journey: [], error: "Server URL is not configured" };
  }

  try {
    const res = await fetch(`${base}/icpc-journey/public`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { journey: [], error: data.error || "Failed to load ICPC journey" };
    }

    return {
      journey: Array.isArray(data.journey) ? data.journey : [],
      error: null,
    };
  } catch (error) {
    return {
      journey: [],
      error: error?.message || "Failed to load ICPC journey",
    };
  }
}

export async function getIcpcJourneyAdminList(token) {
  const base = getBaseUrl();
  if (!base) return { result: [], error: "Server URL is not configured" };

  try {
    const res = await fetch(`${base}/icpc-journey/admin/list`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { result: [], error: data.error || "Failed to load list" };
    return { result: Array.isArray(data.result) ? data.result : [], error: null };
  } catch (error) {
    return { result: [], error: error?.message || "Failed to load list" };
  }
}

export async function createIcpcJourneyAdmin(token, payload) {
  const base = getBaseUrl();
  if (!base) return { error: "Server URL is not configured" };

  try {
    const res = await fetch(`${base}/icpc-journey/admin/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || "Failed to create" };
    return { result: data.result, error: null };
  } catch (error) {
    return { error: error?.message || "Failed to create" };
  }
}

export async function updateIcpcJourneyAdmin(token, payload) {
  const base = getBaseUrl();
  if (!base) return { error: "Server URL is not configured" };

  try {
    const res = await fetch(`${base}/icpc-journey/admin/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || "Failed to update" };
    return { result: data.result, error: null };
  } catch (error) {
    return { error: error?.message || "Failed to update" };
  }
}

export async function deleteIcpcJourneyAdmin(token, id) {
  const base = getBaseUrl();
  if (!base) return { error: "Server URL is not configured" };

  try {
    const res = await fetch(`${base}/icpc-journey/admin/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || "Failed to delete" };
    return { result: data.result, error: null };
  } catch (error) {
    return { error: error?.message || "Failed to delete" };
  }
}

export async function uploadIcpcJourneyImages(files) {
  if (!files || files.length === 0) {
    return { urls: [], error: "No images selected" };
  }

  try {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    const res = await fetch("/api/icpc-images/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { urls: [], error: data.error || "Failed to upload images" };
    }

    return {
      urls: Array.isArray(data.urls) ? data.urls : [],
      error: null,
    };
  } catch (error) {
    return {
      urls: [],
      error: error?.message || "Failed to upload images",
    };
  }
}
