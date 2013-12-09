/***
|''Name:''|ExternalizePlugin|
|''Description:''|Edit tiddlers directly with your favorite external editor (html editor, text processor, javascript IDE, css editor, ...).|
|''Version:''|1.0.1|
|''Date:''|Dec 21,2007|
|''Source:''|https://github.com/buggyj/VisualTW2Plugins/|
|''Author:''|Pascal Collin|
|''License:''|[[BSD open source license|License]]|
|''~CoreVersion:''|2.1.0|
|''Browser:''|Firefox 2.0; InternetExplorer 6.0|
!Installation
#install [[it's All Text!|https://addons.mozilla.org/fr/firefox/addon/4125]] Firefox extension.
#set up [[it's All Text!|https://addons.mozilla.org/fr/firefox/addon/4125]] options in its dialog box (see tips below).
#import this tiddler from [[homepage|http://visualtw.ouvaton.org/VisualTW.html]] (tagged as systemConfig).
#save and reload.
#set up hotkey below.
#use the <<toolbar externalize>> button in the tiddler's toolbar (in default ViewTemplate) or add {{{externalize}}} command in your own toolbar.
! Useful Addons
*[[HTMLFormattingPlugin|http://www.tiddlytools.com/#HTMLFormattingPlugin]] to embed wiki syntax in html tiddlers.<<br>>//__Tips__ : When this plugin is installed, you can use anchor syntax to link tiddlers in wysiwyg mode (example : #example). Anchors are converted back and from wiki syntax when editing.//
*[[TaggedTemplateTweak|http://www.TiddlyTools.com/#TaggedTemplateTweak]] to use alternative ViewTemplate/EditTemplate for tiddler's tagged with specific tag values.
!Configuration options 
|[[it's All Text!|https://addons.mozilla.org/fr/firefox/addon/4125]]  extension hotkey (copy/paste from the extension dialog box)|<<option txtExternalizeHotkey>>|
|Optional tiddler containing instructions to process the text before and after externalization<<br>>Example : [[ExternalizeAsHTML]]|<<option txtExternalizeProccessing>>|
|Template called by the {{{externalize}}} button|[[ExternalizeTemplate]]|
|Max waiting time for //It's All text!// to fire|<<option txtExternalizeMaxTime>>|
!//It's all text!// extension tips
*Tiddler text is edited with the first file extension
*Copy/paste Hot Key from the dialog box (with context menu)
*Edit button isn't necessary for the plugin (it uses hotkey)
*Try the extension configuration first, before trying it with the plugin.
!Code
***/
//{{{
config.options.txtExternalizeHotkey = config.options.txtExternalizeHotkey ? config.options.txtExternalizeHotkey : "";
config.options.txtExternalizeProccessing = config.options.txtExternalizeProccessing ? config.options.txtExternalizeProccessing : "";
config.options.txtExternalizeMaxTime = config.options.txtExternalizeMaxTime ? config.options.txtExternalizeMaxTime : "30";

config.macros.externalize = {
	noExtensionError : "It's all text ! extension wasn't available. Try to fire it manually with htokey or button. If it works, adapt your configuration (increase max waiting time or change hotkey) and try again.",
	hotKeyError : "Hotkey wasn't understood. Use copy/paste from it's all text set up dialog.",
	EmptyHotKeyError : "Hotkey isn't defined. Check ExternalizePlugin configuration.",
	handler : function(place,macroName,params,wikifier,paramString,tiddler) {
		var field = params[0];
		var rows = params[1] || 0;
		var defVal = params[2] || '';
		if((tiddler instanceof Tiddler) && field) {
			story.setDirty(tiddler.title,true);
			var e,v;
			var wrapper1 = createTiddlyElement(null,"fieldset",null,"fieldsetFix");
			var wrapper2 = createTiddlyElement(wrapper1,"div");
			e = createTiddlyElement(wrapper2,"textarea");
			e.setAttribute("readOnly","readOnly");
			v = config.macros.externalize.getValue(tiddler,field);
			v = v ? v : defVal;
			e.value = v;
			rows = rows ? rows : 10;
			var lines = v.match(/\n/mg);
			var maxLines = Math.max(parseInt(config.options.txtMaxEditRows),5);
			if(lines != null && lines.length > rows)
				rows = lines.length + 5;
			rows = Math.min(rows,maxLines);
			var id=tiddler.title+"externalize"+field;
			e.setAttribute("id",id);
			e.setAttribute("rows",rows);
			e.setAttribute("externalize",field);
			place.appendChild(wrapper1);
			config.macros.externalize.externalEdit(id);
			return e;
		}
	},
	externalEdit : function(id){
		window.setTimeout(function(){
			var element = document.getElementById(id);
			if (element) {
				var cpt=element.getAttribute("cpt");
				cpt = cpt ? cpt -1 : parseInt(config.options.txtExternalizeMaxTime);
				element.setAttribute("cpt",cpt);
				if (cpt>0) {
					if (element.getAttribute("itsalltext_uid")) {
						element.dispatchEvent(config.macros.externalize.getKeyEvent());
						addClass(element,"externalized");
					}
					else window.setTimeout(arguments.callee,100)
				}
				else alert(config.macros.externalize.noExtensionError);
			}
		},1000)
	},
	getKeyEvent : function(){
		var hotkey = config.options.txtExternalizeHotkey;
		if (hotkey) {
			var m = hotkey.match(/^(alt)?\s*(ctrl)?\s*(meta)?\s*(shift)?\s*(\w+)\s*$/i);
			if (m) {
				var ev = document.createEvent("KeyboardEvent");
				var cc = m[4]!=undefined ? m[5].toUpperCase() : m[5].toLowerCase();
				var charCode = m[5].length==1 ? cc.charCodeAt(0) : 0;
				var keyCode = m[5].length>1 ? config.macros.externalize.keyMap[m[5]] : 0;
				ev.initKeyEvent("keypress",true,true,window,m[2]!=undefined,m[1]!=undefined,m[4]!=undefined,m[3]!=undefined,keyCode,charCode);
				return ev;
			}
			else alert(config.macros.externalize.hotKeyError);
		}
		else alert(config.macros.externalize.EmptyHotKeyError);
	},
	getValue : function(tiddler,field){
		var v = store.getValue(tiddler,field);
		v = v ? config.macros.externalize.textProcessing(v, "Before") : "";
		v = v.replace(/\[\[([^|\]]*)\|([^\]]*)]]/g,'<a href="#$2">$1</a>');
		return v;
	},
	gather : function(e){
		return config.macros.externalize.textProcessing(e.value,"After");
	},
	readParam : function(source,param){
		var re = new RegExp("^"+ param +"\\s*: *(.*)$","mg");
		var r = source && re ? re.exec(source) : null;
		return r!=null ? r[1] : null;
	},
	textProcessing : function(text,key) {
		var params = config.options.txtExternalizeProccessing;
		var rexp = "^\\["+key+"\\] *(.*)\n(.*)\\n(.*)$";
		if (params) {
			var source = store.getTiddler(params);
			source = source ? source.text : config.shadowTiddlers[params];
			if (source) {
				var re=new RegExp(rexp,"mg");
				var instructions = source.match(re);
				for(var cpt=0; cpt<instructions.length; cpt++){
					re=new RegExp(rexp,"mg");
					var res = re.exec(instructions[cpt]);
					text = text.replace(new RegExp(res[2],res[1]),res[3]); 
				}
			}
		}
		return text;	
	}
}

config.commands.externalize= {
	text: "externalize",
	tooltip: "Edit this tiddler with an external editor",
	handler : function(event,src,title) {
		clearMessage();
		var tiddlerElem = document.getElementById(story.idPrefix + title);
		var fields = tiddlerElem.getAttribute("tiddlyFields");
		story.displayTiddler(null,title,"ExternalizeTemplate",false,null,fields);
		story.focusTiddler(title,"text");
		return false;
	}
}

Story.prototype.previousGatherSaveExternalize = Story.prototype.previousGatherSaveExternalize ? Story.prototype.previousGatherSaveExternalize : Story.prototype.gatherSaveFields; // to avoid looping if this line is called several times
Story.prototype.gatherSaveFields = function(e,fields){
	if(e && e.getAttribute) {
		var f = e.getAttribute("externalize");
		if(f){
			var newVal = config.macros.externalize.gather(e);
			if (newVal) fields[f] = newVal;
		}
		this.previousGatherSaveExternalize(e, fields);
	}
}

config.macros.externalize.keyMap = {
        'Backspace'   : 8,
        'Tab'   : 9,
        'Enter'	: 13,
        'Break'	: 19,
        'Escape'	: 27,
        'PgUp'	: 33,
        'PgDn'	: 34,
        'End'	: 35,
        'Home'	: 36,
        'Left'	: 37,
        'Up'	: 38,
        'Right'	: 39,
        'Down'	: 40,
        'Insert'	: 45,
        'Delete'	: 46,
        'F1'	: 112,
        'F2'	: 113,
        'F3'	: 114,
        'F4'	: 115,
        'F5'	: 116,
        'F6'	: 117,
        'F7'	: 118,
        'F8'	: 119,
        'F9'	: 120,
        'F10'	: 121,
        'F11'	: 122,
        'Num Lock'	: 144,
        'Scroll Lock'	: 145
};

config.shadowTiddlers.ExternalizeAsHTML = "/*{{{*/\n";
config.shadowTiddlers.ExternalizeAsHTML += "[Before] g\n\\n\n<br/>\n\n";
config.shadowTiddlers.ExternalizeAsHTML += "[Before] gi\n(?:^<html>(.*)<\/html>$)|(^.*$)\n<html><body>$1$2</body></html>\n\n";
config.shadowTiddlers.ExternalizeAsHTML += "[After] g\n\\n|\\t\n\n\n";
config.shadowTiddlers.ExternalizeAsHTML += "[After] gi\n.*<html[^>]*>.*<body[^>]*>(.*)<\/body><\/html>\n<html>$1</html>\n\n";
config.shadowTiddlers.ExternalizeAsHTML += "/*}}}*/\n";

config.shadowTiddlers.ViewTemplate = config.shadowTiddlers.ViewTemplate.replace(/\+editTiddler/,"+editTiddler externalize");

config.shadowTiddlers.ExternalizeTemplate = config.shadowTiddlers.EditTemplate.replace(/macro='edit text'/,"macro='externalize text'");

config.shadowTiddlers.StyleSheetExternalize = "/*{{{*/\n";
config.shadowTiddlers.StyleSheetExternalize += ".externalized {color: [[ColorPalette::TertiaryMid]]}\n";
config.shadowTiddlers.StyleSheetExternalize +="/*}}}*/";
store.addNotification("StyleSheetExternalize", refreshStyles);

//}}}
