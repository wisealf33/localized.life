# Localized.life Network Vision and Design Guardrails

Status: Living draft. This document records confirmed direction and separates it from questions that still need Garrett's decisions.

## Why This Document Exists

Localized.life is not a standard marketplace, social network, CRM, directory, or conventional service company. Familiar product patterns can introduce the wrong assumptions. Product, data, and interface decisions should begin with the network model described here instead of copying standard industry patterns.

When a proposed feature conflicts with this document, stop and confirm the direction before building it.

## Confirmed Direction

### One Person, Not Separate Customer and Provider Records

- A human being has one Person record.
- The same Person may receive services, provide services, coordinate people, make referrals, or do several of these things.
- Customer and provider describe a person's role in a particular interaction. They are not permanent person types.
- New features must not create duplicate identities merely because someone acts in a different role.

### Entry Is Relationship-Based

- The network is not based on unrestricted access to every person in a public directory.
- People normally enter through an established Person, referral, Connector, coordinator, or a relevant Local Services request.
- A Person should schedule or coordinate work with people in their actual network relationship, not arbitrary profiles across the system.
- Unassigned incoming referrals are reviewed and assigned manually by Garrett at the current stage.
- Automated rotation, priority, or assignment rules should not be invented until the referral and Connector model is explicitly defined.

### Minimum Person Intake

Starting a Person record requires both:

- At least one name component: first name or last name.
- At least one contact method: phone number or email address.

First and last name together are preferred when available. A separate profile name is optional and may be generated from the available name.

All other fields are optional and should exist only when they support a known network operation.

### Profiles Are Operational, Not Social

- A Person profile is not a social-media profile, résumé, lifestyle page, or public biography.
- Do not add conventional social-profile fields merely because other platforms use them.
- Pronouns are not collected or used.
- Biography, occupation, social links, interests, languages, community roles, and similar "about me" fields are outside the current profile model.
- Practical skills or services may be recorded as tags because they help connect real needs with real capabilities.
- Private operational details may include contact information, service addresses, scheduling information, relationship notes, and relevant needs.

### Data Must Have a Concrete Purpose

Before adding a Person field, identify:

1. Which real network action uses it.
2. Who enters it.
3. Who may see it.
4. Whether it belongs to the Person, a relationship, a service engagement, or an appointment.
5. Whether the action can work without collecting it.

Future usefulness alone is not enough reason to collect personal information.

### Privacy and Access

- Personal and service details are private unless an explicit feature and permission make them visible.
- A Person does not choose profile, contact, or location visibility from preference controls. The system determines access from the viewer's role and network relationship.
- The founder/system manager may access all Person details needed to operate and govern the network.
- An ordinary Person's management tools are limited to People they directly introduced, People explicitly connected to them, and People explicitly assigned to their responsibility.
- A Person's details may be available to the system without being available to every member. "Stored in the system" and "visible to this viewer" are separate decisions.
- A service address belongs with the service relationship or calendar context when it is not the Person's general address.
- Account access is available to people who have been onboarded; it is findable in the footer without becoming a primary public call to action.
- Public Local Services requests remain the general entry path for people seeking help.

### Practical Product Priorities

- Onboard real people early and learn from actual use.
- Preserve one continuous Person identity as someone claims an account or takes on additional roles.
- Support established customers and appointments through the private calendar.
- Keep referral decisions visible and manually controllable until the network rules are mature.
- Prefer a small number of purposeful fields and workflows over broad speculative profile collection.

## Current Product Vocabulary

- **Person:** The universal human identity in the network.
- **Connection:** A recognized relationship between two People.
- **Referral:** The relationship or introduction through which a Person enters or moves through the network.
- **Connector:** A Person with responsibility or tools for helping coordinate People and requests.
- **Coordinator:** A Person who may organize work, referrals, or network activity. The exact distinction from Connector remains to be defined.
- **Provider:** A contextual role when a Person provides a service; not a Person type.
- **Customer:** A contextual role when a Person receives a service; not a Person type.
- **Skill/service tag:** A practical capability used to connect needs and services.

## Design Review Checklist

Before implementing a new identity, onboarding, relationship, referral, or account feature, verify:

- Does this preserve one Person record across roles?
- Is the feature based on real relationships rather than unrestricted network access?
- Does every requested field have an identified operational use?
- Is Person data stored in the correct context instead of being placed on a generic profile?
- Does the interface avoid social-network, résumé, and generic marketplace assumptions?
- Are manual control and visibility preserved where assignment rules are not yet defined?
- Is private information private by default?
- Is the terminology consistent with the vocabulary above?

If any answer is unclear, ask before building.

## Open Questions for the Vision Session

These questions should be answered by Garrett. They must not be filled in from standard business assumptions.

### Purpose and Long-Term Outcome

- What change in a community should Localized.life ultimately create?
- What would the mature network make possible that cannot be done through existing companies, platforms, or organizations?
- What must never be sacrificed as the network grows?

### Relationship Structure

- What precisely creates a Connection?
- What is an upline referral, and what rights or responsibilities travel with it?
- How do Connector, coordinator, referrer, service provider, and member differ?
- Can relationships have direction, levels, territories, or duration?
- What happens when a Person changes Connector or has several legitimate connections?

### Work and Referral Flow

- What is the complete path from an incoming request to a completed service interaction?
- Who is eligible to receive an unassigned referral, and in what priority order?
- Which decisions must remain human, and which may eventually be automated?
- How are quality, trust, availability, distance, and existing relationships balanced?

### Authority and Governance

- Who may invite, approve, connect, assign, edit, or remove People?
- Which actions belong to Garrett, Connectors, coordinators, providers, and the Person themselves?
- How are disputes, inactive relationships, and inappropriate use handled?

### Economics and Incentives

- Where does money move in the network?
- Are referrals, coordination, services, membership, or territories compensated?
- What behavior should the economic model encourage or prevent?

### Information and Privacy

- Which facts belong to a Person versus a relationship, service record, referral, or appointment?
- What may a Connector see that another connected Person may not?
- Which roles, beyond the founder/system manager, may see inherited or multi-level downline relationships rather than only direct relationships?
- What should happen to information entered by someone else after a Person claims their account?
- What information, if any, should ever be publicly discoverable?

### Geography and Growth

- Is the network fundamentally local, territorial, layered, or capable of overlapping regions?
- What defines a local area: distance, town, county, personal network, or something else?
- How should the model expand without becoming a generic national directory?

## Change Discipline

- Add confirmed decisions to this document as they are made.
- Keep unresolved ideas in the open-questions section.
- Do not convert an open question into product behavior without Garrett's decision.
- Review this document before proposing significant changes to Person data, roles, access, referrals, scheduling, or network structure.
