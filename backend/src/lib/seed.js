const supabase = require('./supabase');

const timeAgo = (ms) => {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
};

async function seedUserData(userId) {
  const now = Date.now();

  // ── Leads ──────────────────────────────────────────────────────
  await supabase.from('leads').insert([
    { user_id: userId, name: 'Nana Ama',     source: 'WhatsApp',  interest: '3 bed · East Legon',   budget: '400–500k', status: 'Hot',  ai_score: 92, created_at: new Date(now - 2  * 60000).toISOString() },
    { user_id: userId, name: 'Kofi Mensah',  source: 'Instagram', interest: 'Apt · Airport Res',     budget: '280–320k', status: 'Warm', ai_score: 71, created_at: new Date(now - 10 * 60000).toISOString() },
    { user_id: userId, name: 'Akua Addo',    source: 'Website',   interest: '4 bed · Cantonments',   budget: '700k+',    status: 'Hot',  ai_score: 88, created_at: new Date(now - 60 * 60000).toISOString() },
    { user_id: userId, name: 'Kwame Boateng',source: 'Facebook',  interest: '2 bed · Tema',           budget: '150–200k', status: 'New',  ai_score: null, created_at: new Date(now - 2  * 3600000).toISOString() },
    { user_id: userId, name: 'Afia Serwaa',  source: 'WhatsApp',  interest: 'Land · Adenta',          budget: '80–120k',  status: 'Cold', ai_score: 34, created_at: new Date(now - 3  * 3600000).toISOString() },
    { user_id: userId, name: 'Emefa Ofori',  source: 'Instagram', interest: '1 bed · Osu',            budget: '180–220k', status: 'Warm', ai_score: 65, created_at: new Date(now - 4  * 3600000).toISOString() },
    { user_id: userId, name: 'Ama Owusu',    source: 'WhatsApp',  interest: '3 bed · Labone',         budget: '400–450k', status: 'New',  ai_score: 45, created_at: new Date(now - 5  * 3600000).toISOString() },
    { user_id: userId, name: 'Yaw Darko',    source: 'Instagram', interest: 'Land · Adenta',          budget: '90–110k',  status: 'Cold', ai_score: 22, created_at: new Date(now - 6  * 3600000).toISOString() },
  ]);

  // ── Properties ─────────────────────────────────────────────────
  await supabase.from('properties').insert([
    { user_id: userId, name: '3 Bed House · East Legon',  location: 'Accra · Added May 10', price: 'GHS 480,000',   price_numeric: 480000, type: 'sale', status: 'Verified', emoji: '🏠', color: 'green'  },
    { user_id: userId, name: '2 Bed Apt · Airport Res',   location: 'Accra · Added May 8',  price: 'GHS 4,200 / mo',price_numeric: 4200,   type: 'rent', status: 'Verified', emoji: '🏢', color: 'blue'   },
    { user_id: userId, name: 'Land · Adenta',             location: 'Accra · Added May 5',  price: 'GHS 95,000',    price_numeric: 95000,  type: 'land', status: 'Pending',  emoji: '🌳', color: 'amber'  },
    { user_id: userId, name: '4 Bed · Cantonments',       location: 'Accra · Added May 3',  price: 'GHS 780,000',   price_numeric: 780000, type: 'sale', status: 'Verified', emoji: '🏘', color: 'purple' },
    { user_id: userId, name: 'Office Space · Osu',        location: 'Accra · Added Apr 28', price: 'GHS 8,500 / mo',price_numeric: 8500,   type: 'rent', status: 'Verified', emoji: '🏗', color: 'coral'  },
    { user_id: userId, name: '2 Bed · Tema',              location: 'Greater Accra · Apr 22',price:'GHS 195,000',   price_numeric: 195000, type: 'sale', status: 'Pending',  emoji: '🏠', color: 'teal'   },
  ]);

  // ── Pipeline deals ─────────────────────────────────────────────
  await supabase.from('pipeline_deals').insert([
    { user_id: userId, property_name: '3 bed · Labone',      client: 'Ama Owusu · WhatsApp',   amount: 'GHS 420k',  amount_numeric: 420000, stage: 'New',         progress: 25  },
    { user_id: userId, property_name: 'Land · Adenta',        client: 'Yaw Darko · Instagram',  amount: 'GHS 95k',   amount_numeric: 95000,  stage: 'New',         progress: 15  },
    { user_id: userId, property_name: '2 bed · Spintex',      client: 'Abena Asare · Web',      amount: 'GHS 210k',  amount_numeric: 210000, stage: 'New',         progress: 10  },
    { user_id: userId, property_name: 'Apt · Airport Res',    client: 'Nana Ama · WhatsApp',    amount: 'GHS 310k',  amount_numeric: 310000, stage: 'Qualified',   progress: 55  },
    { user_id: userId, property_name: '4 bed · East Legon',   client: 'Kojo Asante · Web',      amount: 'GHS 750k',  amount_numeric: 750000, stage: 'Qualified',   progress: 60  },
    { user_id: userId, property_name: '1 bed · Osu',          client: 'Emefa Ofori · IG',       amount: 'GHS 195k',  amount_numeric: 195000, stage: 'Qualified',   progress: 45  },
    { user_id: userId, property_name: '2 bed · Tema',         client: 'Efua Mensah · WA',       amount: 'GHS 195k',  amount_numeric: 195000, stage: 'Negotiating', progress: 80  },
    { user_id: userId, property_name: 'Office · Osu',         client: 'GBL Ventures · Web',     amount: 'GHS 1.2m',  amount_numeric: 1200000,stage: 'Negotiating', progress: 75  },
    { user_id: userId, property_name: '3 bed · Cantonments',  client: 'Akua Addo · Web',        amount: 'GHS 560k',  amount_numeric: 560000, stage: 'Closed',      progress: 100 },
    { user_id: userId, property_name: 'Land · Spintex',       client: 'T. Amoah · WA',          amount: 'GHS 290k',  amount_numeric: 290000, stage: 'Closed',      progress: 100 },
  ]);

  // ── Follow-ups ─────────────────────────────────────────────────
  await supabase.from('follow_ups').insert([
    { user_id: userId, title: 'Follow up with Akua Addo',        subtitle: 'Send viewing confirmation · WhatsApp', time_text: '10:00 AM',      status: 'Done',         completed: true  },
    { user_id: userId, title: 'Call Kofi Mensah',                subtitle: 'Discuss Airport Res apartment options', time_text: '1:00 PM',      status: 'Scheduled',    completed: false },
    { user_id: userId, title: 'Send property details · Nana Ama',subtitle: 'East Legon 3 bed listings PDF',         time_text: 'Tomorrow 9AM', status: 'AI will send', completed: false },
    { user_id: userId, title: 'Re-engage Yaw Darko',             subtitle: 'Cold lead · 5 days no response',        time_text: 'Overdue',      status: 'Overdue',      completed: false },
    { user_id: userId, title: 'Viewing reminder · GBL Ventures', subtitle: 'Osu office space · Tomorrow 10AM',      time_text: 'Tonight 6PM',  status: 'AI will send', completed: false },
  ]);

  // ── Campaigns ──────────────────────────────────────────────────
  await supabase.from('campaigns').insert([
    { user_id: userId, label: 'D1', color: 'g', title: 'New lead · Day 1',        subtitle: 'Sends immediately on new lead · 89 leads enrolled',     status: 'Active' },
    { user_id: userId, label: 'D2', color: 'b', title: 'New lead · Day 2',        subtitle: 'Sends 24hr after first message · 64 leads enrolled',     status: 'Active' },
    { user_id: userId, label: 'D5', color: 'a', title: 'Re-engagement · Day 5',   subtitle: 'For cold/no-reply leads · 31 leads enrolled',            status: 'Active' },
  ]);

  // ── AI Templates ───────────────────────────────────────────────
  await supabase.from('ai_templates').insert([
    { user_id: userId, trigger_label: 'New',  trigger_color: 'new',  trigger_desc: 'New lead sends first message on any channel',     question: 'Lead: "Hi, I\'m interested in one of your properties"',answer: "Hi! 👋 Thanks for reaching out to Dream Homes Realty. I'm here to help you find the perfect property. Are you looking to <strong>buy</strong> or <strong>rent</strong>?", used_count: 1240, continue_rate: 94, auto_tag: 'Auto' },
    { user_id: userId, trigger_label: 'Warm', trigger_color: 'warm', trigger_desc: 'Lead says "buy" → asks location preference',        question: 'Lead: "I want to buy"',                                  answer: "Great choice! 🏠 Which area are you looking at? We have properties in East Legon, Airport Residential, Cantonments, Labone, Tema, and Adenta.", used_count: 810, continue_rate: 88, auto_tag: 'Auto' },
    { user_id: userId, trigger_label: 'Hot',  trigger_color: 'hot',  trigger_desc: 'Lead gives budget → matches to listings',           question: 'Lead: "My budget is around 400–500k"',                   answer: "Perfect! We have 3 properties in that range right now. A 3-bed in East Legon at GHS 480k, a 4-bed in Labone at GHS 460k, and a 3-bed in Airport Res at GHS 495k. Want me to send you details on any of these? 📋", used_count: 420, continue_rate: 76, auto_tag: 'Escalates' },
    { user_id: userId, trigger_label: 'Cold', trigger_color: 'cold', trigger_desc: 'Lead goes cold — no reply for 24 hours',            question: 'Lead: [no response]',                                    answer: "Hey! 👋 Just checking in — did you get a chance to look at those listings? We have some new properties that just came in. Let me know if you'd like more info 🏠", used_count: 312, continue_rate: 41, auto_tag: 'Auto · Day 2' },
  ]);

  // ── Conversations + Messages ────────────────────────────────────
  const convSeed = [
    { name: 'Nana Ama',     initials: 'NA', avatar_color: 'g', source: 'WhatsApp',  status: 'AI live',     ai_active: true,  lead_status: 'Hot',  unread: true,  context: '3 bed buyer · East Legon',
      messages: [
        { type:'in',  text:"Hi, I'm interested in one of your properties 🙏",                                                                   time_text:'10:30 AM',         label:null },
        { type:'ai',  text:"Hi! 👋 Thanks for reaching out to Dream Homes Realty. Are you looking to buy or rent?",                             time_text:'10:30 AM · 4 sec', label:'🤖 AI Reply' },
        { type:'in',  text:'Buy please',                                                                                                         time_text:'10:31 AM',         label:null },
        { type:'ai',  text:"Great! What's your preferred location? East Legon, Airport Res, Cantonments, or Tema?",                              time_text:'10:31 AM · 3 sec', label:'🤖 AI Reply' },
        { type:'in',  text:'East Legon preferably. 3 bedrooms.',                                                                                 time_text:'10:33 AM',         label:null },
        { type:'ai',  text:"We have 3 listings in East Legon right now from GHS 420k–560k. What's your budget range? I'll match you to the best options 🏠", time_text:'10:33 AM · 5 sec', label:'🤖 AI Reply' },
        { type:'in',  text:'Around 450–500k is fine',                                                                                            time_text:'10:35 AM',         label:null },
        { type:'ai',  text:"Perfect match! I'm connecting you with Kwame now — he'll share full details and arrange a viewing 📅",               time_text:'10:35 AM · 3 sec', label:'🤖 AI Reply — escalating to agent' },
      ]
    },
    { name: 'Kofi Mensah',  initials: 'KM', avatar_color: 'b', source: 'Instagram', status: 'AI live',     ai_active: true,  lead_status: 'Warm', unread: true,  context: 'Apt buyer · Airport Res',
      messages: [
        { type:'in', text:"What's the price for a 2 bed apartment?",                                                                             time_text:'11:00 AM',         label:null },
        { type:'ai', text:'Hi Kofi! Our 2-bedroom apartments range from GHS 280k–320k depending on location. Which area are you considering?', time_text:'11:00 AM · 3 sec', label:'🤖 AI Reply' },
      ]
    },
    { name: 'Akua Addo',    initials: 'AA', avatar_color: 'a', source: 'WhatsApp',  status: 'Needs you',   ai_active: false, lead_status: 'Hot',  unread: false, context: '4 bed buyer · Cantonments',
      messages: [
        { type:'in', text:'I saw the 4 bed in Cantonments. Can I schedule a viewing this weekend?',                                              time_text:'9:15 AM',          label:null },
        { type:'ai', text:"Absolutely! I'll flag this to our agent Kwame who will confirm a time with you shortly.",                             time_text:'9:15 AM · 2 sec',  label:'🤖 AI Reply' },
      ]
    },
    { name: 'Kwame Boateng',initials: 'KB', avatar_color: 'p', source: 'Facebook',  status: 'AI live',     ai_active: true,  lead_status: 'New',  unread: false, context: '2 bed buyer · Tema',
      messages: [
        { type:'in', text:'Anything in Tema under 200k?',                                                                                        time_text:'8:30 AM',          label:null },
        { type:'ai', text:'Yes! We have a 2-bedroom in Tema at GHS 195,000. Great value for the location. Interested in details?',              time_text:'8:30 AM · 4 sec',  label:'🤖 AI Reply' },
      ]
    },
    { name: 'Afia Serwaa',  initials: 'AS', avatar_color: 'r', source: 'WhatsApp',  status: 'Closed cold', ai_active: false, lead_status: 'Cold', unread: false, context: 'Land buyer · Adenta',
      messages: [
        { type:'in', text:'Just browsing for now, thanks',                                                                                       time_text:'7:45 AM',          label:null },
        { type:'ai', text:"No problem! I'll send you our latest listings. Feel free to reach out when you're ready 😊",                         time_text:'7:45 AM · 3 sec',  label:'🤖 AI Reply' },
      ]
    },
  ];

  for (const c of convSeed) {
    const { data: conv } = await supabase.from('conversations').insert({
      user_id: userId, name: c.name, initials: c.initials, avatar_color: c.avatar_color,
      last_message: c.messages[c.messages.length - 1]?.text || '',
      source: c.source, status: c.status, ai_active: c.ai_active,
      lead_status: c.lead_status, unread: c.unread, context: c.context,
    }).select().single();
    if (conv) {
      await supabase.from('messages').insert(
        c.messages.map(m => ({ conversation_id: conv.id, type: m.type, text: m.text, time_text: m.time_text, label: m.label }))
      );
    }
  }
}

module.exports = { seedUserData };
