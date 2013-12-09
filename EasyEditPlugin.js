/***
|''Name:''|EasyEditPlugin|
|''Description:''|Lite and extensible Wysiwyg editor for TiddlyWiki.|
|''Version:''|1.3.3|
|''Date:''|Dec 21,2007|
|''Source:''|https://github.com/buggyj/VisualTW2Plugins/|
|''Author:''|Pascal Collin|
|''License:''|[[BSD open source license|License]]|
|''~CoreVersion:''|2.1.0|
|''Browser:''|Firefox 2.0; InternetExplorer 6.0|
!Demo
*On the plugin [[homepage|http://visualtw.ouvaton.org/VisualTW.html]], see [[WysiwygDemo]] and use the {{{write}}} button.
!Installation
#import the plugin,
#save and reload,
#use the <<toolbar easyEdit>> button in the tiddler's toolbar (in default ViewTemplate) or add {{{easyEdit}}} command in your own toolbar.
! Useful Addons
*[[HTMLFormattingPlugin|http://www.tiddlytools.com/#HTMLFormattingPlugin]] to embed wiki syntax in html tiddlers.<<br>>//__Tips__ : When this plugin is installed, you can use anchor syntax to link tiddlers in wysiwyg mode (example : #example). Anchors are converted back and from wiki syntax when editing.//
*[[TaggedTemplateTweak|http://www.TiddlyTools.com/#TaggedTemplateTweak]] to use alternative ViewTemplate/EditTemplate for tiddler's tagged with specific tag values.
!Configuration
|Buttons in the toolbar (empty = all).<<br>>//Example : bold,underline,separator,forecolor//<<br>>The buttons will appear in this order.| <<option txtEasyEditorButtons>>|
|EasyEditor default height | <<option txtEasyEditorHeight>>|
|Stylesheet applied to the edited richtext |[[EasyEditDocStyleSheet]]|
|Template called by the {{{write}}} button |[[EasyEditTemplate]]|
!How to extend EasyEditor
*To add your own buttons, add some code like the following in a systemConfig tagged tiddler (//use the prompt attribute only if there is a parameter//) :
**{{{EditorToolbar.buttons.heading = {label:"H", toolTip : "Set heading level", prompt: "Enter heading level"};}}} 
**{{{EditorToolbar.buttonsList +=",heading";}}}
*To get the list of all possible commands, see the documentation of the [[Gecko built-in rich text editor|http://developer.mozilla.org/en/docs/Midas]] or the [[IE command identifiers|http://msdn2.microsoft.com/en-us/library/ms533049.aspx]].
*To go further in customization, see [[Link button|EasyEditPlugin-LinkButton]] as an example.
!Code
***/

//{{{

var geckoEditor={};
var IEeditor={};

config.options.txtEasyEditorHeight = config.options.txtEasyEditorHeight ? config.options.txtEasyEditorHeight : "500px";
config.options.txtEasyEditorButtons = config.options.txtEasyEditorButtons ? config.options.txtEasyEditorButtons : "";

// TW2.1.x compatibility
config.browser.isGecko = config.browser.isGecko ? config.browser.isGecko : (config.userAgent.indexOf("gecko") != -1); 
config.macros.annotations = config.macros.annotations ? config.macros.annotations : {handler : function() {}}


// EASYEDITOR MACRO

config.macros.easyEdit = {
	handler : function(place,macroName,params,wikifier,paramString,tiddler) {
		var field = params[0];
		var height = params[1] ? params[1] : config.options.txtEasyEditorHeight;
		var editor = field ? new easyEditor(tiddler,field,place,height) : null;
	},
	gather: function(element){
		var iframes = element.getElementsByTagName("iframe");
		if (iframes.length!=1) return null
		var text = "<html>"+iframes[0].contentWindow.document.body.innerHTML+"</html>";
		text = config.browser.isGecko ? geckoEditor.postProcessor(text) : (config.browser.isIE ? IEeditor.postProcessor(text) : text);
		return text;
	}
}

// EASYEDITOR CLASS

function easyEditor(tiddler,field,place,height) {
	this.tiddler = tiddler;
	this.field = field;
	this.browser = config.browser.isGecko ? geckoEditor : (config.browser.isIE ? IEeditor : null);
	this.wrapper = createTiddlyElement(place,"div",null,"easyEditor");
	this.wrapper.setAttribute("easyEdit",this.field);
	this.iframe = createTiddlyElement(null,"iframe");
	this.browser.setupFrame(this.iframe,height,contextualCallback(this,this.onload));
	this.wrapper.appendChild(this.iframe);
}

easyEditor.prototype.onload = function(){
	this.editor = this.iframe.contentWindow;
	this.doc = this.editor.document;
	if (!this.browser.isDocReady(this.doc)) return null;
	
	if (!this.tiddler.isReadOnly() && this.doc.designMode.toLowerCase()!="on") {
		this.doc.designMode = "on";
		if (this.browser.reloadOnDesignMode) return false;	// IE fire readystatechange after designMode change
	}
	
	var internalCSS = store.getTiddlerText("EasyEditDocStyleSheet");
	setStylesheet(internalCSS,"EasyEditDocStyleSheet",this.doc);
	this.browser.initContent(this.doc,store.getValue(this.tiddler,this.field));

	var barElement=createTiddlyElement(null,"div",null,"easyEditorToolBar");
	this.wrapper.insertBefore(barElement,this.wrapper.firstChild);
	this.toolbar = new EditorToolbar(this.doc,barElement,this.editor);

	this.browser.plugEvents(this.doc,contextualCallback(this,this.scheduleButtonsRefresh));
	this.editor.focus();
}

easyEditor.SimplePreProcessoror = function(text) {
	var re = /^<html>(.*)<\/html>$/m;
	var htmlValue = re.exec(text);
	var value = (htmlValue && (htmlValue.length>0)) ? htmlValue[1] : text;
	return value;
}

easyEditor.prototype.scheduleButtonsRefresh=function() { //doesn't refresh buttons state when rough typing
	if (this.nextUpdate) window.clearTimeout(this.nextUpdate);
	this.nextUpdate = window.setTimeout(contextualCallback(this.toolbar,EditorToolbar.onUpdateButton),easyEditor.buttonDelay);
}

easyEditor.buttonDelay = 200;

// TOOLBAR CLASS

function EditorToolbar(target,parent,window){
	this.target = target;
	this.window=window;
	this.elements={};
	var row = createTiddlyElement(createTiddlyElement(createTiddlyElement(parent,"table"),"tbody"),"tr");
	var buttons = (config.options.txtEasyEditorButtons ? config.options.txtEasyEditorButtons : EditorToolbar.buttonsList).split(",");
	for(var cpt = 0; cpt < buttons.length; cpt++){
		var b = buttons[cpt];
		var button = EditorToolbar.buttons[b];
		if (button) {
			if (button.separator)
				createTiddlyElement(row,"td",null,"separator").innerHTML+="&nbsp;";
			else {
				var cell=createTiddlyElement(row,"td",null,b+"Button");
				if (button.onCreate) button.onCreate.call(this, cell, b);
				else EditorToolbar.createButton.call(this, cell, b);
			}
		}
	}
}

EditorToolbar.createButton = function(place,name){
	this.elements[name] = createTiddlyButton(place,EditorToolbar.buttons[name].label,EditorToolbar.buttons[name].toolTip,contextualCallback(this,EditorToolbar.onCommand(name)),"button");
}

EditorToolbar.onCommand = function(name){
	var button = EditorToolbar.buttons[name];
	return function(){
		var parameter = false;
		if (button.prompt) {
			var parameter = this.target.queryCommandValue(name);
			parameter = prompt(button.prompt,parameter);
		}
		if (parameter != null) {
			this.target.execCommand(name, false, parameter);
			EditorToolbar.onUpdateButton.call(this);
		}
		return false;
	}
}

EditorToolbar.getCommandState = function(target,name){
	try {return target.queryCommandState(name)}
	catch(e){return false}
}

EditorToolbar.onRefreshButton = function (name){
	if (EditorToolbar.getCommandState(this.target,name)) addClass(this.elements[name].parentNode,"buttonON");
	else removeClass(this.elements[name].parentNode,"buttonON");
	this.window.focus();
}

EditorToolbar.onUpdateButton = function(){
	for (b in this.elements) 
		if (EditorToolbar.buttons[b].onRefresh) EditorToolbar.buttons[b].onRefresh.call(this,b);
		else EditorToolbar.onRefreshButton.call(this,b);
}

EditorToolbar.buttons = {
	separator : {separator : true},
	bold : {label:"B", toolTip : "Bold"},
	italic : {label:"I", toolTip : "Italic"},
	underline : {label:"U", toolTip : "Underline"},
	strikethrough : {label:"S", toolTip : "Strikethrough"},
	insertunorderedlist : {label:"\u25CF", toolTip : "Unordered list"},
	insertorderedlist : {label:"1.", toolTip : "Ordered list"},
	justifyleft : {label:"[\u2261", toolTip : "Align left"},
	justifyright : {label:"\u2261]", toolTip : "Align right"},
	justifycenter : {label:"\u2261", toolTip : "Align center"},
	justifyfull : {label:"[\u2261]", toolTip : "Justify"},
	removeformat : {label:"\u00F8", toolTip : "Remove format"},
	fontsize : {label:"\u00B1", toolTip : "Set font size", prompt: "Enter font size"},
	forecolor : {label:"C", toolTip : "Set font color", prompt: "Enter font color"},
	fontname : {label:"F", toolTip : "Set font name", prompt: "Enter font name"},
	heading : {label:"H", toolTip : "Set heading level", prompt: "Enter heading level (example : h1, h2, ...)"},
	indent : {label:"\u2192[", toolTip : "Indent paragraph"},
	outdent : {label:"[\u2190", toolTip : "Outdent paragraph"},
	inserthorizontalrule : {label:"\u2014", toolTip : "Insert an horizontal rule"},
	insertimage : {label:"\u263C", toolTip : "Insert image", prompt: "Enter image url"}
}

EditorToolbar.buttonsList = "bold,italic,underline,strikethrough,separator,increasefontsize,decreasefontsize,fontsize,forecolor,fontname,separator,removeformat,separator,insertparagraph,insertunorderedlist,insertorderedlist,separator,justifyleft,justifyright,justifycenter,justifyfull,indent,outdent,separator,heading,separator,inserthorizontalrule,insertimage";

if (config.browser.isGecko) {
	EditorToolbar.buttons.increasefontsize = {onCreate : EditorToolbar.createButton, label:"A", toolTip : "Increase font size"};
	EditorToolbar.buttons.decreasefontsize = {onCreate : EditorToolbar.createButton, label:"A", toolTip : "Decrease font size"};
	EditorToolbar.buttons.insertparagraph = {label:"P", toolTip : "Format as paragraph"};
}

// GECKO (FIREFOX, ...) BROWSER SPECIFIC METHODS

geckoEditor.setupFrame = function(iframe,height,callback) {
	iframe.setAttribute("style","width: 100%; height:" + height);
	iframe.addEventListener("load",callback,true);
}

geckoEditor.plugEvents = function(doc,onchange){
	doc.addEventListener("keyup", onchange, true);
	doc.addEventListener("keydown", onchange, true);
	doc.addEventListener("click", onchange, true);
}

geckoEditor.postProcessor = function(text){return text};

geckoEditor.preProcessor = function(text){return easyEditor.SimplePreProcessoror(text)}

geckoEditor.isDocReady = function() {return true;}

geckoEditor.reloadOnDesignMode=false;

geckoEditor.initContent = function(doc,content){
	if (content) doc.execCommand("insertHTML",false,geckoEditor.preProcessor(content));
}

// INTERNET EXPLORER BROWSER SPECIFIC METHODS
	
IEeditor.setupFrame = function(iframe,height,callback) {
	iframe.width="99%";  //IE displays the iframe at the bottom if 100%. CSS layout problem ? I don't know. To be studied...
	iframe.height=height.toString();
	iframe.attachEvent("onreadystatechange",callback);
}

IEeditor.plugEvents = function(doc,onchange){
	doc.attachEvent("onkeyup", onchange);
	doc.attachEvent("onkeydown", onchange);
	doc.attachEvent("onclick", onchange);
}

IEeditor.isDocReady = function(doc){
	if (doc.readyState!="complete") return false;
	if (!doc.body) return false;
	return (doc && doc.getElementsByTagName && doc.getElementsByTagName("head") && doc.getElementsByTagName("head").length>0);
}

IEeditor.postProcessor = function(text){return text};

IEeditor.preProcessor = function(text){return easyEditor.SimplePreProcessoror(text)}

IEeditor.reloadOnDesignMode=true;

IEeditor.initContent = function(doc,content){
	if (content) doc.body.innerHTML=IEeditor.preProcessor(content);
}
	
function contextualCallback(obj,func){
    return function(){return func.call(obj)}
}
	
Story.prototype.previousGatherSaveEasyEdit = Story.prototype.previousGatherSaveEasyEdit ? Story.prototype.previousGatherSaveEasyEdit : Story.prototype.gatherSaveFields; // to avoid looping if this line is called several times
Story.prototype.gatherSaveFields = function(e,fields){
	if(e && e.getAttribute) {
		var f = e.getAttribute("easyEdit");
		if(f){
			var newVal = config.macros.easyEdit.gather(e);
			if (newVal) fields[f] = newVal;
		}
		this.previousGatherSaveEasyEdit(e, fields);
	}
}

config.commands.easyEdit={
	text: "write",
	tooltip: "Edit this tiddler in wysiwyg mode",
	readOnlyText: "view",
	readOnlyTooltip: "View the source of this tiddler",
	handler : function(event,src,title) {
		clearMessage();
		var tiddlerElem = document.getElementById(story.idPrefix + title);
		var fields = tiddlerElem.getAttribute("tiddlyFields");
		story.displayTiddler(null,title,"EasyEditTemplate",false,null,fields);
		return false;
	}
}

config.shadowTiddlers.ViewTemplate = config.shadowTiddlers.ViewTemplate.replace(/\+editTiddler/,"+editTiddler easyEdit");

config.shadowTiddlers.EasyEditTemplate = config.shadowTiddlers.EditTemplate.replace(/macro='edit text'/,"macro='easyEdit text'");

config.shadowTiddlers.EasyEditToolBarStyleSheet = "/*{{{*/\n";
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar {font-size:0.8em}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".editor iframe {border:1px solid #DDD}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar td{border:1px solid #888; padding:2px 1px 2px 1px; vertical-align:middle}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar td.separator{border:0}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar .button{border:0;color:#444}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar .buttonON{background-color:#EEE}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar {margin:0.25em 0}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar .boldButton {font-weight:bold}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar .italicButton .button {font-style:italic;padding-right:0.65em}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar .underlineButton .button {text-decoration:underline}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar .strikeButton .button {text-decoration:line-through}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar .unorderedListButton {margin-left:0.7em}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar .justifyleftButton .button {padding-left:0.1em}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar .justifyrightButton .button {padding-right:0.1em}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar .justifyfullButton .button, .easyEditorToolBar .indentButton .button, .easyEditorToolBar .outdentButton .button {padding-left:0.1em;padding-right:0.1em}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar .increasefontsizeButton .button {padding-left:0.15em;padding-right:0.15em; font-size:1.3em; line-height:0.75em}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar .decreasefontsizeButton .button {padding-left:0.4em;padding-right:0.4em; font-size:0.8em;}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar .forecolorButton .button {color:red;}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet += ".easyEditorToolBar .fontnameButton .button {font-family:serif}\n" ;
config.shadowTiddlers.EasyEditToolBarStyleSheet +="/*}}}*/";

store.addNotification("EasyEditToolBarStyleSheet", refreshStyles); 

config.shadowTiddlers.EasyEditDocStyleSheet = "/*{{{*/\n \n/*}}}*/";
if (config.annotations) config.annotations.EasyEditDocStyleSheet = "This stylesheet is applied when editing a text with the wysiwyg easyEditor";

//}}}
/***
!Link button add-on
***/
//{{{
EditorToolbar.createLinkButton = function(place,name) {
	this.elements[name] = createTiddlyButton(place,EditorToolbar.buttons[name].label,EditorToolbar.buttons[name].toolTip,contextualCallback(this,EditorToolbar.onInputLink()),"button");
}

EditorToolbar.onInputLink = function() {
	return function(){
		var browser = config.browser.isGecko ? geckoEditor : (config.browser.isIE ? IEeditor : null);
		var value = browser ? browser.getLink(this.target) : "";
		value = prompt(EditorToolbar.buttons["createlink"].prompt,value);
		if (value) browser.doLink(this.target,value);
		else if (value=="") this.target.execCommand("unlink", false, value);
		EditorToolbar.onUpdateButton.call(this);
		return false;
	}
}

EditorToolbar.buttonsList += ",separator,createlink";

EditorToolbar.buttons.createlink = {onCreate : EditorToolbar.createLinkButton, label:"L", toolTip : "Set link", prompt: "Enter link url"};


geckoEditor.getLink=function(doc){
	var range=doc.defaultView.getSelection().getRangeAt(0);
	var container = range.commonAncestorContainer;
	var node = (container.nodeType==3) ? container.parentNode : range.startContainer.childNodes[range.startOffset];
	if (node && node.tagName=="A") {
		var r=doc.createRange();
		r.selectNode(node);
		doc.defaultView.getSelection().addRange(r);
		return (node.getAttribute("tiddler") ? "#"+node.getAttribute("tiddler") : node.href);
	}
	else return (container.nodeType==3 ? "#"+container.textContent.substr(range.startOffset, range.endOffset-range.startOffset).replace(/ $/,"") : "");
}

geckoEditor.doLink=function(doc,link){ // store tiddler in a temporary attribute to avoid url encoding of tiddler's name
	var pin = "href"+Math.random().toString().substr(3);
	doc.execCommand("createlink", false, pin);
	var isTiddler=(link.charAt(0)=="#");
	var node = doc.defaultView.getSelection().getRangeAt(0).commonAncestorContainer;
	var links= (node.nodeType!=3) ? node.getElementsByTagName("a") : [node.parentNode];
	for (var cpt=0;cpt<links.length;cpt++) 
			if (links[cpt].href==pin){
				links[cpt].href=isTiddler ? "javascript:;" : link; 
				links[cpt].setAttribute("tiddler",isTiddler ? link.substr(1) : "");
			}
}

geckoEditor.beforeLinkPostProcessor = geckoEditor.beforelinkPostProcessor ? geckoEditor.beforelinkPostProcessor : geckoEditor.postProcessor;
geckoEditor.postProcessor = function(text){
	return geckoEditor.beforeLinkPostProcessor(text).replace(/<a tiddler="([^"]*)" href="javascript:;">(.*?)(?:<\/a>)/gi,"[[$2|$1]]").replace(/<a tiddler="" href="/gi,'<a href="');
}

geckoEditor.beforeLinkPreProcessor = geckoEditor.beforeLinkPreProcessor ? geckoEditor.beforeLinkPreProcessor : geckoEditor.preProcessor
geckoEditor.preProcessor = function(text){
	return geckoEditor.beforeLinkPreProcessor(text).replace(/\[\[([^|\]]*)\|([^\]]*)]]/g,'<a tiddler="$2" href="javascript:;">$1</a>');
}


IEeditor.getLink=function(doc){
	var node=doc.selection.createRange().parentElement();
	if (node.tagName=="A") return node.href;
	else return (doc.selection.type=="Text"? "#"+doc.selection.createRange().text.replace(/ $/,"") :"");
}

IEeditor.doLink=function(doc,link){
	doc.execCommand("createlink", false, link);
}

IEeditor.beforeLinkPreProcessor = IEeditor.beforeLinkPreProcessor ? IEeditor.beforeLinkPreProcessor : IEeditor.preProcessor
IEeditor.preProcessor = function(text){
	return IEeditor.beforeLinkPreProcessor(text).replace(/\[\[([^|\]]*)\|([^\]]*)]]/g,'<a ref="#$2">$1</a>');
}

IEeditor.beforeLinkPostProcessor = IEeditor.beforelinkPostProcessor ? IEeditor.beforelinkPostProcessor : IEeditor.postProcessor;
IEeditor.postProcessor = function(text){
	return IEeditor.beforeLinkPostProcessor(text).replace(/<a href="#([^>]*)">([^<]*)<\/a>/gi,"[[$2|$1]]");
}

IEeditor.beforeLinkInitContent = IEeditor.beforeLinkInitContent ? IEeditor.beforeLinkInitContent : IEeditor.initContent;
IEeditor.initContent = function(doc,content){
	IEeditor.beforeLinkInitContent(doc,content);
	var links=doc.body.getElementsByTagName("A");
	for (var cpt=0; cpt<links.length; cpt++) {
		links[cpt].href=links[cpt].ref; //to avoid IE conversion of relative URLs to absolute
		links[cpt].removeAttribute("ref");	
	}
}

config.shadowTiddlers.EasyEditToolBarStyleSheet += "\n/*{{{*/\n.easyEditorToolBar .createlinkButton .button {color:blue;text-decoration:underline;}\n/*}}}*/";

config.shadowTiddlers.EasyEditDocStyleSheet += "\n/*{{{*/\na {color:#0044BB;font-weight:bold}\n/*}}}*/";

//}}}
