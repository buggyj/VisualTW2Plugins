/***
|''Name:''|EncryptedVaultPlugin|
|''Description:''|Adds RC4 encryption and password protection to tiddywiki.|
|''Version:''|1.0.1|
|''Date:''|Dec 21,2007|
|''Source:''|https://github.com/buggyj/VisualTW2Plugins/|
|''Author:''|Pascal Collin|
|''License:''|[[BSD open source license|License]]|
|''~CoreVersion:''|2.2.0|
|''Browser:''|Firefox 2.0; InternetExplorer 6.0, others|
!Description
*Create an ''encrypted vault'' where all tiddlers are ''password protected''. 
*By default, only the system tiddlers aren't encrypted.
*Even shadow tiddlers (MainMenu, SiteTitle, PageTemplate, StyleSheet, ...) ''can be encrypted''. The shadow version is used until unlocking.
!Demo
Use <<unlock>> button on a protected wiki. By example : http://visualtw.ouvaton.org/demo/EncryptedVaultPlugin.html
!Installation
#Import the plugin (tagged as systemConfig)
#Save and reload
#Save once more time to create the encrypted vault
#Reload and set a password
!Usage
*Use <<unlock>><<setPassword>> button (available by default in SideBarOptions)
*Use a blank password to save unencrypted (disable vault usage)
*Use {{{unencrypted}}} tag to avoid encryption for some tiddler
*Use {{{forceEncryption}}} tag to force some shadow tiddler to be encrypted
!Configuration
The following macros are available :
*{{{<<unlock ButtonTitle ButtonTooltip OpenTiddlersWhenUnlock CloseTiddlersWhenUnlock>>}}} creates a button to unlock the encrypted vault (all parameters are optionnal)
*{{{<<setPassword ButtonTitle ButtonTooltip>>}}} if unlocked, creates a button to set the current password (all parameters are optionnal)
*{{{<<purge ButtonTitle ButtonTooltip>>}}} if locked, creates a button to purge a locked vault, useful for lost password (encrypted content is the deleted)
*{{{<<ifLocked tiddlyText>>}}} displays tiddlyText (wikified) if the vault is locked
*{{{<<ifUnlocked tiddlyText>>}}} displays tiddlyText (wikified) if the vault is unlocked
<<ifLocked "!!!!Lost password ?">><<ifLocked "Click on">> <<purge>><<ifLocked "to delete any content locked in the encrypted vault.">>
***/
//{{{

config.messages.vaultCreationInfo = "The encrypted vault has been created";
config.messages.purgeConfirm = "Purge the encrypted vault ?\n\nAll unlocked content will be lost.";
config.messages.vaultPurgedInfo = "All contents have been purged from encrypted vault.\nPassword has been blanked.\nYou must save once to apply this changes.";
config.messages.vaultEncryptedInfo = "Saving with encryption";
config.messages.vaultUnchangedInfo = "No changes in Encrypted vault";
config.messages.noLockedVaultWarning = "Unable to proceed. No locked encrypted vault.";
config.messages.emptyVaultInfo = "Saving without encryption";
config.messages.saveWithLockedVaultConfirm = "Encrypted vault is locked. No changes will apply inside.\n\nAre you sure ?";
config.messages.confirmOverload = "This following tiddler already exists in system store. Overload ?\nOK : the encrypted version will replace the system store version\nCancel : the system store version will replace the encrypted version";

SaverBase.systemStore="unencrypted";
SaverBase.vault="forceEncryption";

var startSaveVaultArea = '<div id="' + 'vaultArea">'; // Split up into two so that indexOf() of this source doesn't find it
var endSaveVaultArea = '</d' + 'iv>';

config.shadowTiddlers.SideBarOptions = config.shadowTiddlers.SideBarOptions.replace(/<<saveChanges>>/,"<<unlock>><<setPassword>><<saveChanges>>");
config.shadowTiddlers.GettingStarted+="\n\n<<ifLocked 'This TiddlyWiki use EncryptedVaultPlugin. To load protected content click on'>><<unlock>><<ifUnlocked 'This TiddlyWiki use EncryptedVaultPlugin. To set or change password click on'>><<setPassword>>"

window.updateOriginal= function(original,posDiv)	// overriding the TW2.2 standard function
{
	var vaultIsUpdatable = (!locateVaultArea(original) || !vault.isLocked() || vault.purge);  // vault is new, unlocked or must be purged
	
	if(!posDiv)
		posDiv = locateStoreArea(original);
	if(!posDiv) {
		alert(config.messages.invalidFileError.format([localPath]));
		return null;
	}
	var revised = original.substr(0,posDiv[0] + startSaveArea.length) + "\n" +
				convertUnicodeToUTF8((vaultIsUpdatable && vault.password) ? store.allUnencryptedTiddlersAsHtml() : store.allTiddlersAsHtml())  + "\n" +
				original.substr(posDiv[1]);
				
	if (vaultIsUpdatable) {
		posVault = locateVaultArea(original)
		if(!posVault) {
			revised=createVault(revised);
			posVault = locateVaultArea(revised);
			if(!posVault) {
				alert(config.messages.invalidFileError.format([localPath]));
				return;
			}
		}
		var revised = revised.substr(0,posVault[0] + startSaveVaultArea.length) +
					convertUnicodeToUTF8(vault.password ? vault.encrypt(store.allEncryptedTiddlersAsHtml()) : "") +
					revised.substr(posVault[1]);
		if (vault.password) displayMessage(config.messages.vaultEncryptedInfo);
		else displayMessage(config.messages.emptyVaultInfo);
	}
	else displayMessage(config.messages.vaultUnchangedInfo);
	
	var newSiteTitle = convertUnicodeToUTF8(getPageTitle()).htmlEncode();
	revised = revised.replaceChunk("<title"+">","</title"+">"," " + newSiteTitle + " ");
	revised = updateLanguageAttribute(revised);
	revised = updateMarkupBlock(revised,"PRE-HEAD","MarkupPreHead");
	revised = updateMarkupBlock(revised,"POST-HEAD","MarkupPostHead");
	revised = updateMarkupBlock(revised,"PRE-BODY","MarkupPreBody");
	revised = updateMarkupBlock(revised,"POST-SCRIPT","MarkupPostBody");
	return revised;
}

function createVault(original) {
	var revised=original.replace(/<!--POST-SHADOWAREA-->/,'<!--POST-SHADOWAREA-->\n<div id="vaultArea"></div>\n<!--POST-VAULTAREA-->');
	var vaultStyles = '<!--PRE-VAULTSTYLE-START-->\n<style type="text/css">\n#vaultArea {display:none;}\n#vaultArea div {padding:0.5em; margin:1em 0em 0em 0em; border-color:#fff #666 #444 #ddd; border-style:solid; border-width:2px; overflow:auto;}\n</style>\n<!--PRE-VAULTSTYLE-END-->\n';
	if (revised.search("<!--PRE-VAULTSTYLE-START-->")<0) var revised=revised.replace(/<!--POST-HEAD-START-->/,vaultStyles +'<!--POST-HEAD-START-->');
	alert(config.messages.vaultCreationInfo);
	return revised;
}

function locateVaultArea(original)  //cloned from the TW2.2 standard function
{
	// Locate the vaultArea div's. Should be just before the storeArea div
	var posOpeningDiv = original.indexOf(startSaveVaultArea);
	var limitClosingDiv = original.indexOf("<"+"!--POST-VAULTAREA--"+">");
	if(limitClosingDiv == -1)
		limitClosingDiv = original.indexOf("<div id="+'"storeArea"'+">");
	var posClosingDiv = original.lastIndexOf(endSaveVaultArea,limitClosingDiv);
	return (posOpeningDiv != -1 && posClosingDiv != -1) ? [posOpeningDiv,posClosingDiv] : null;
}

TiddlyWiki.prototype.allUnencryptedTiddlersAsHtml = function() {
	return store.getSaver().externalize(store, SaverBase.systemStore);
};

TiddlyWiki.prototype.allEncryptedTiddlersAsHtml = function() {
	return store.getSaver().externalize(store, SaverBase.vault);
};

SaverBase.prototype.externalize = function(store, tiddlerType) // overriding the TW2.2 standard function
{
	var results = [];
	var tiddlers = store.getTiddlers("title");
	for(var t = 0; t < tiddlers.length; t++)
		if (!tiddlerType || (this.getTiddlerType(tiddlers[t]) == tiddlerType))	// this line was changed from standard function
			results.push(this.externalizeTiddler(store,tiddlers[t]));
	return results.join("\n");
};

SaverBase.prototype.getTiddlerType= function(tiddler) {
	if (tiddler.isTagged(SaverBase.vault)) return SaverBase.vault;
	if (store.isShadowTiddler([tiddler.title])) return SaverBase.systemStore;
	if (tiddler.isTagged("systemConfig")||tiddler.isTagged(SaverBase.systemStore)) return SaverBase.systemStore;
	return SaverBase.vault;
};

LoaderBase.prototype.loadTiddler = function(store,node,tiddlers) // overriding the TW2.2 standard function
{
	var title = this.getTitle(store,node);
	if (store.getTiddler(title) && !confirm(config.messages.confirmOverload+"\n\n"+title)) // this line was changed from standard function
		return;	
	if(title) {
		var tiddler = store.createTiddler(title);
		this.internalizeTiddler(store,tiddler,title,node);
		tiddlers.push(tiddler);
	}
};

window.saveChanges_noVault = window.saveChanges;
window.saveChanges= function(onlyIfDirty,tiddlers){
	if (!vault.isLocked() || vault.purge || !vault.exists() || (vault.isLocked() && confirm(config.messages.saveWithLockedVaultConfirm)))
		saveChanges_noVault(onlyIfDirty,tiddlers);
}

vault = {
	load : function(){
		if (!vault.isLocked()) {
			alert(config.messages.vaultAlreadyUnlockedWarning);
			return false;
		}
		else {
			var storeElem = document.getElementById("vaultArea");
			if (storeElem) {
				var src = storeElem.innerHTML;
				var pwd = vault.password ? vault.password : "";
				while ((vault.isEncrypted(src)) && (pwd!=null)) {
					if (pwd) src = vault.decrypt(src, pwd);
					if (vault.isEncrypted(src)) pwd = prompt(vault.prompt,pwd);
				}
				if (pwd!=null) vault.password = pwd;
				if (!vault.isEncrypted(src)) {
					var wasDirty = store.isDirty();
					var e = document.createElement("div");
					e.innerHTML=src;
					if (src) store.getLoader().loadTiddlers(store,e.childNodes);
					vault.loaded = true;
					refreshAll();
					story.refreshAllTiddlers();
					store.setDirty(wasDirty);
					return true;
				}
				else return false;
			}
		}
	},
	decrypt : function(src,pwd){
		var res = Crypto.cryptomx.decrypt(pwd,src.substr(vault.prefix.length));
		return res  ? res : src;
	},
	isEncrypted : function(src) {
		return (src.substr(0,vault.prefix.length) == vault.prefix);
	},
	encrypt : function(src){
		return vault.password ? vault.prefix + Crypto.cryptomx.encrypt(vault.password,src) : src;
	},
	isLocked : function(){
		if (vault.loaded) return false;
		var storeElem = document.getElementById("vaultArea");
		return (!storeElem || (storeElem && vault.isEncrypted(storeElem.innerHTML)));
	},
	exists : function() {
		return (document.getElementById("vaultArea")!=null);
	},
	prefix : "Cryptomx@",
	prompt : "Enter a password",
	loaded : false,
	purge : false
}

config.macros.unlock = {
	handler : function(place,macroName,params,wikifier,paramString,tiddler) {
		var label = params[0] ? params[0] : "unlock vault";
		var tooltip = params[1] ? params[1] : "unlock encrypted vault";
		var openTiddlers = params[2] ? params[2] : "";
		var closeTiddlers = params[3] ? params[3] : "";
		if (vault.isLocked() && vault.exists()) {
			var btn = createTiddlyButton(place,label, tooltip,this.onClick);
			btn.setAttribute("openTiddlers",openTiddlers);
			btn.setAttribute("closeTiddlers",closeTiddlers);
		}
	},
    onClick:function(){
		var openTiddlers = this.getAttribute("openTiddlers");
		var closeTiddlers = this.getAttribute("closeTiddlers");
		if (vault.load()) {
			if (closeTiddlers) {
				var tiddlers = store.filterTiddlers(closeTiddlers);
				for(var t=0; t<tiddlers.length; t++) {
					var elem = document.getElementById(story.idPrefix + tiddlers[t].title);
					if (elem && elem.getAttribute("dirty")!="true")
						story.closeTiddler(tiddlers[t].title);
				}
			}
			if (openTiddlers) {
				var tiddlers = store.filterTiddlers(openTiddlers);
				for(var t=0; t<tiddlers.length; t++)
					story.displayTiddler("bottom",tiddlers[t].title);
			}
		}
		return false;
	}
}

config.macros.setPassword = {
	handler : function(place,macroName,params,wikifier,paramString,tiddler) {
		var label = params[0] ? params[0] : "set password";
		var tooltip = params[1] ? params[1] : "Set password for encrypted vault";
		if (!vault.isLocked()) createTiddlyButton(place, label, tooltip,this.onClick);
	},
    onClick:function(){
		var pwd = prompt(vault.prompt,(vault.password ? vault.password : ""));
		if (pwd != null) vault.password = pwd;
		return false;
	}
}

config.macros.purge = {
	handler : function(place,macroName,params,wikifier,paramString,tiddler) {
		var label = params[0] ? params[0] : "purge vault";
		var tooltip = params[1] ? params[1] : "Delete locked vault";
		if (vault.isLocked() && vault.exists()) createTiddlyButton(place,label, tooltip,this.onClick);
	},
    onClick:function(){
		if (!vault.isLocked())
			alert(config.messages.noLockedVaultWarning);
		else
			if (confirm(config.messages.purgeConfirm)) {
				vault.purge=true;
				alert(config.messages.vaultPurgedInfo);
			}
		return false;
	}
}

config.macros.ifLocked = {
	handler : function(place,macroName,params,wikifier,paramString,tiddler) {
		if (vault.isLocked() && vault.exists()) wikify(params[0],place,null,tiddler);
	}
}

config.macros.ifUnlocked = {
	handler : function(place,macroName,params,wikifier,paramString,tiddler) {
		if (!vault.isLocked()) wikify(params[0],place,null,tiddler);
	}
}

//}}}


/***
Cryptomx code from http://cryptomx.sourceforge.net
***/
//{{{
Crypto.cryptomx = {
	dg :'',
	makeArray: function(n) {
		for (var i=1; i<=n; i++) {
			this[i]=0
		}
		return this
	},
	rc4: function(key, text) {
		var i, x, y, t, x2;
		this.status("rc4")
		s=this.makeArray(0);
		
		for (i=0; i<256; i++) {
			s[i]=i
		}
		y=0
		for (x=0; x<256; x++) {
			y=(key.charCodeAt(x % key.length) + s[x] + y) % 256
			t=s[x]; s[x]=s[y]; s[y]=t
		}
		x=0;  y=0;
		var z=""
		for (x=0; x<text.length; x++) {
			x2=x % 256
			y=( s[x2] + y) % 256
			t=s[x2]; s[x2]=s[y]; s[y]=t
			z+= String.fromCharCode((text.charCodeAt(x) ^ s[(s[x2] + s[y]) % 256]))
		}
		return z
	},
	badd: function(a,b) { // binary add
		var r=''
		var c=0
		while(a || b) {
			c=this.chop(a)+this.chop(b)+c
			a=a.slice(0,-1); b=b.slice(0,-1)
			if(c & 1) {
				r="1"+r
			} else {
				r="0"+r
			}
			c>>=1
		}
		if(c) {r="1"+r}
		return r
	},
	chop:function(a) {
		if(a.length) {
			return parseInt(a.charAt(a.length-1))
		} else {
			return 0
		}
	},
	bsub:function(a,b) { // binary subtract
		var r=''
		var c=0
		while(a) {
			c=this.chop(a)-this.chop(b)-c
			a=a.slice(0,-1); b=b.slice(0,-1)
			if(c==0) {
				r="0"+r
			}
			if(c == 1) {
				r="1"+r
				c=0
			}
			if(c == -1) {
				r="1"+r
				c=1
			}
			if(c==-2) {
				r="0"+r
				c=1
			}
		}
		if(b || c) {return ''}
		return this.bnorm(r)
	},
	bnorm:function(r) { // trim off leading 0s
		var i=r.indexOf('1')
		if(i == -1) {
			return '0'
		} else {
			return r.substr(i)
		}
	},
	bmul:function(a,b) { // binary multiply
		var r=''; var p=''
		while(a) {
			if(this.chop(a) == '1') {
				r=this.badd(r,b+p)
			}
			a=a.slice(0,-1)
			p+='0'
		}
		return r;
	},
	bmod:function(a,m) { // binary modulo
		return this.bdiv(a,m).mod
	},
	bdiv:function(a,m) { // binary divide & modulo
		// this.q = quotient this.mod=remainder
		var lm=m.length, al=a.length
		var p='',d
		this.q=''
		for(n=0; n<al; n++) {
			p=p+a.charAt(n);
			if(p.length<lm || (d=this.bsub(p,m)) == '') {
				this.q+='0'
			} else {
				if(this.q.charAt(0)=='0') {
					this.q='1'
				} else {
					this.q+="1"
				}
				p=d
			}
		}
		this.mod=this.bnorm(p)
		return this
	},
	bmodexp:function(x,y,m) { // binary modular exponentiation
		var r='1'
		this.status("bmodexp "+x+" "+y+" "+m)
		
		while(y) {
			if(this.chop(y) == 1) {
				r=this.bmod(this.bmul(r,x),m)
			}
			y=y.slice(0,y.length-1)
			x=this.bmod(this.bmul(x,x),m)
		}
		return this.bnorm(r)
	},
	modexp:function(x,y,m) { // modular exponentiation
		// convert packed bits (text) into strings of 0s and 1s
		return this.b2t(this.bmodexp(this.t2b(x),this.t2b(y),this.t2b(m)))
	},
	i2b: function(i) { // convert integer to binary
		var r=''
		while(i) {
			if(i & 1) { r="1"+r} else {r="0"+r}
			i>>=1;
		}
		return r? r:'0'
	},
	t2b:function(s) {
		var r=''
		if(s=='') {return '0'}
		while(s.length) {
			var i=s.charCodeAt(0)
			s=s.substr(1)
			for(n=0; n<8; n++) {
				r=((i & 1)? '1':'0') + r
				i>>=1;
			}
		}
		return this.bnorm(r)
	},
	b2t:function(b) {
		var r=''; var v=0; var m=1
		while(b.length) {
			v|=this.chop(b)*m
			b=b.slice(0,-1)
			m<<=1
			if(m==256 || b=='') {
				r+=String.fromCharCode(v)
				v=0; m=1
			}
		}
		return r
	},
	b64s:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"',
	textToBase64:function(t) {
		this.status("t 2 b64")
		var r=''; var m=0; var a=0; var tl=t.length-1; var c
		for(n=0; n<=tl; n++) {
			c=t.charCodeAt(n)
			r+=this.b64s.charAt((c << m | a) & 63)
			a = c >> (6-m)
			m+=2
			if(m==6 || n==tl) {
				r+=this.b64s.charAt(a)
				if((n%45)==44) {r+="\n"}
				m=0
				a=0
			}
		}
		return r
	},
	base64ToText:function(t) {
		this.status("b64 2 t")
		var r=''; var m=0; var a=0; var c
		for(n=0; n<t.length; n++) {
			c=this.b64s.indexOf(t.charAt(n))
			if(c >= 0) {
				if(m) {
					r+=String.fromCharCode((c << (8-m))&255 | a)
				}
				a = c >> m
				m+=2
				if(m==8) { m=0 }
			}
		}
		return r
	},

	rand:function(n) {  return Math.floor(Math.random() * n) },
	rstring:function(s,l) {
		var r=""
		var sl=s.length
		while(l>0) {
			l=l-1;
			r+=s.charAt(rand(sl))
		}
		//status("rstring "+r)
		return r
	},
	key2:function(k) {
		var l=k.length
		var kl=l
		var r=''
		while(l--) {
			r+=k.charAt((l*3)%kl)
		}
		return r
	},
	rsaEncrypt:function(keylen,key,mod,text) {
		// I read that rc4 with keys larger than 256 bytes doesn't significantly
		// increase the level of rc4 encryption because it's sbuffer is 256 bytes
		// makes sense to me, but what do i know...

		this.status("encrypt")
		if(text.length >= keylen) {
			var sessionkey=this.rc4(rstring(text,keylen),rstring(text,keylen))

			// session key must be less than mod, so mod it
			sessionkey=this.b2t(bmod(t2b(sessionkey),t2b(mod)))
			alert("sessionkey="+sessionkey)

			// return the rsa encoded key and the encrypted text
			// i'm double encrypting because it would seem to me to
			// lessen known-plaintext attacks, but what do i know
			return this.modexp(sessionkey,key,mod) +
			this.rc4(this.key2(sessionkey),this.rc4(sessionkey,text))
		} else {

			// don't need a session key
			return this.modexp(text,key,mod)
		}
	},
	rsaDecrypt:function(keylen,key,mod,text) {
		this.status("decrypt")
		if(text.length <= keylen) {
			return this.modexp(text,key,mod)
		} else {

			// sessionkey is first keylen bytes
			var sessionkey=text.substr(0,keylen)
			text=text.substr(keylen)

			// un-rsa the session key
			sessionkey=this.modexp(sessionkey,key,mod)
			alert("sessionkey="+sessionkey)

			// double decrypt the text
			return this.rc4(sessionkey,this.rc4(this.key2(sessionkey,text),text))
		}
	},
	trim2:function(d) { return d.substr(0,d.lastIndexOf('1')+1) },
	bgcd:function(u,v) { // return greatest common divisor
		// algorythm from http://algo.inria.fr/banderier/Seminar/Vallee/index.html
		var d, t
		while(1) {
			d=this.bsub(v,u)
			//alert(v+" - "+u+" = "+d)
			if(d=='0') {return u}
			if(d) {
				if(d.substr(-1)=='0') {
					v=d.substr(0,d.lastIndexOf('1')+1) // v=(v-u)/2^val2(v-u)
				} else v=d
			} else {
				t=v; v=u; u=t // swap u and v
			}
		}
	},

	isPrime:function(p) {
		var n,p1,p12,t
		p1=this.bsub(p,'1')
		t=p1.length-p1.lastIndexOf('1')
		p12=this.trim2(p1)
		for(n=0; n<2; n+=this.mrtest(p,p1,p12,t)) {
			if(n<0) return 0
		}
		return 1
	},
	mrtest:function(p,p1,p12,t) {
		// Miller-Rabin test from forum.swathmore.edu/dr.math/
		var n,a,u
		a='1'+this.rstring('01',Math.floor(p.length/2)) // random a
		//alert("mrtest "+p+", "+p1+", "+a+"-"+p12)
		u=this.bmodexp(a,p12,p)
		if(u=='1') {return 1}
		for(n=0;n<t;n++) {
			u=this.bmod(this.bmul(u,u),p)
			//dg+=u+" "
			if(u=='1') return -100
			if(u==p1) return 1
		}
		return -100
	},
	pfactors:'11100011001110101111000110001101',
	// this number is 3*5*7*11*13*17*19*23*29*31*37
	prime:function(bits) {
		// return a prime number of bits length
		var p='1'+this.rstring('001',bits-2)+'1'
		while( ! this.isPrime(p)) {
			p=badd(p,'10'); // add 2
		}
		alert("p is "+p)
		return p
	},
	genkey:function(bits) {
		q=prime(bits)
		do {
			p=q
			q=prime(bits)
		} while(bgcd(p,q)!='1')
		p1q1=this.bmul(this.bsub(p,'1'),this.bsub(q,'1'))
		// now we need a d, e,  and an n so that:
		//  p1q1*n-1=de  -> bmod(bsub(bmul(d,e),'1'),p1q1)='0'
		// or more specifically an n so that d & p1q1 are rel prime and factor e
		n='1'+this.rstring('001',Math.floor(bits/3)+2)
		alert('n is '+n)
		factorMe=this.badd(this.bmul(p1q1,n),'1')
		alert('factor is '+factorMe)
		//e=bgcd(factorMe,p1q1)
		//alert('bgcd='+e)
		e='1'
		// is this always 1?
		//r=bdiv(factorMe,e)
		//alert('r='+r.q+" "+r.mod)
		//if(r.mod != '0') {alert('Mod Error!')}
		//factorMe=r.q
		d=this.bgcd(factorMe,'11100011001110101111000110001101')
		alert('d='+d)
		if(d == '1' && e == '1') {alert('Factoring failed '+factorMe+' p='+p+' q='+q)}
		e=this.bmul(e,d)
		r=this.bdiv(factorMe,d)
		d=r.q
		if(r.mod != '0') {alert('Mod Error 2!')}

		this.mod=this.b2t(bmul(p,q))
		this.pub=this.b2t(e)
		this.priv=this.b2t(d)
	},
	status:function(a) { },//alert(a)}
	encrypt:function(key,text) {
		return this.textToBase64(this.rc4(key,"check:"+text));
	},
	decrypt:function(key,text){
		var uncrypt = this.rc4(key,this.base64ToText(text));
		return (uncrypt.substr(0,6)=="check:") ? uncrypt.substr(6) : null;
	}
}

//}}}
