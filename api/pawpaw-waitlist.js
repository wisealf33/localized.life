async function findSendFoxListId(token) {
  const configuredListId = process.env.SENDFOX_PAWPAW_LIST_ID || process.env.SENDFOX_LIST_ID;
  if (configuredListId) return configuredListId;

  const listName = process.env.SENDFOX_PAWPAW_LIST_NAME || "Paw Paw Revival";
  const targetName = listName.trim().toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const listsResponse = await fetch(`https://api.sendfox.com/lists?page=${page}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      }
    });

    if (!listsResponse.ok) {
      throw new Error("Could not read SendFox lists.");
    }

    const payload = await listsResponse.json();
    const lists = Array.isArray(payload.data) ? payload.data : [];
    const match = lists.find((list) => String(list.name || "").trim().toLowerCase() === targetName);

    if (match?.id) return match.id;
    if (!payload.next_page_url && (!payload.last_page || page >= payload.last_page)) break;
  }

  throw new Error(`Could not find a SendFox list named "${listName}".`);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.SENDFOX_API_TOKEN;

  if (!token) {
    return response.status(500).json({ error: "SendFox is not configured." });
  }

  const { name, email } = request.body || {};

  if (!email || !name) {
    return response.status(400).json({ error: "Name and email are required." });
  }

  const [firstName, ...lastNameParts] = String(name).trim().split(/\s+/);
  let listId;

  try {
    listId = await findSendFoxListId(token);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }

  const body = new URLSearchParams({
    email: String(email),
    first_name: firstName || String(name),
    last_name: lastNameParts.join(" ")
  });
  body.append("lists[]", String(listId));

  const sendFoxResponse = await fetch("https://api.sendfox.com/contacts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!sendFoxResponse.ok) {
    const errorText = await sendFoxResponse.text();
    return response.status(sendFoxResponse.status).json({
      error: "SendFox rejected the signup.",
      details: errorText
    });
  }

  return response.status(200).json({ ok: true });
}
