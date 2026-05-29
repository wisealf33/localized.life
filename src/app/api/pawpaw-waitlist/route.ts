import { NextResponse } from "next/server";

type WaitlistBody = {
  name?: string;
  email?: string;
  seedCount?: number;
  treeCount?: number;
  amount?: number;
  message?: string;
};

async function findSendFoxListId(token: string) {
  const configuredListId = process.env.SENDFOX_PAWPAW_LIST_ID || process.env.SENDFOX_LIST_ID;
  if (configuredListId) return configuredListId;

  const listName = process.env.SENDFOX_PAWPAW_LIST_NAME || "Paw Paw Revival";
  const targetName = listName.trim().toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const listsResponse = await fetch(`https://api.sendfox.com/lists?page=${page}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!listsResponse.ok) {
      throw new Error("Could not read SendFox lists.");
    }

    const payload = await listsResponse.json();
    const lists = Array.isArray(payload.data) ? payload.data : [];
    const match = lists.find((list: { id?: number | string; name?: string }) => String(list.name || "").trim().toLowerCase() === targetName);

    if (match?.id) return String(match.id);
    if (!payload.next_page_url && (!payload.last_page || page >= payload.last_page)) break;
  }

  throw new Error(`Could not find a SendFox list named "${listName}".`);
}

export async function POST(request: Request) {
  const token = process.env.SENDFOX_API_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "SendFox is not configured." }, { status: 500 });
  }

  const { name, email }: WaitlistBody = await request.json().catch(() => ({}));

  if (!email || !name) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const [firstName, ...lastNameParts] = String(name).trim().split(/\s+/);
  let listId: string;

  try {
    listId = await findSendFoxListId(token);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not find SendFox list." }, { status: 500 });
  }

  const body = new URLSearchParams({
    email: String(email),
    first_name: firstName || String(name),
    last_name: lastNameParts.join(" "),
  });
  body.append("lists[]", listId);

  const sendFoxResponse = await fetch("https://api.sendfox.com/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!sendFoxResponse.ok) {
    const errorText = await sendFoxResponse.text();
    return NextResponse.json(
      {
        error: "SendFox rejected the signup.",
        details: errorText,
      },
      { status: sendFoxResponse.status },
    );
  }

  return NextResponse.json({ ok: true });
}
