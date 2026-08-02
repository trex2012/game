import deku from './deku.js';
import yuji from './yuji.js';
import maki from './maki.js';
import bakugo from './bakugo.js';
import megumi from './megumi.js';
import nobara from './nobara.js';
import naoya from './naoya.js';
import choso from './choso.js';
import mahito from './mahito.js';
import toji from './toji.js';
import geto from './geto.js';
import shigaraki from './shigaraki.js';
import allmight from './allmight.js';
import gojo from './gojo.js';
import sukuna from './sukuna.js';
import todoroki from './todoroki.js';
import allforone from './allforone.js';
import nanami from './nanami.js';
import yuta from './yuta.js';
import hawks from './hawks.js';

// Display/unlock order: starters first, then by unlock level.
export const ROSTER = [
  deku, yuji, maki, bakugo, megumi, nobara, naoya, choso, mahito,
  toji, geto, shigaraki, allmight, gojo, sukuna, todoroki, allforone, nanami, yuta, hawks,
];

export const byId = Object.fromEntries(ROSTER.map((d) => [d.id, d]));
