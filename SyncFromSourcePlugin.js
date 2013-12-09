/***
|''Name:''|SyncFromSourcePlugin|
|''Description:''|Synchronizes plugins from their original source (issued from plugin info) instead of imported url. So, plugins can be imported from any existing tiddlywiki and still be synchronized with their original source.|
|''Version:''|1.0.0|
|''Date:''|Dec 21,2007|
|''Source:''|https://github.com/buggyj/VisualTW2Plugins/|
|''Author:''|Pascal Collin|
|''License:''|[[BSD open source license|License]]|
|''~CoreVersion:''|2.2.0|
|''Browser:''|Firefox 1.5; InternetExplorer 6.0|
!Usage
#import the plugin, save and reload.
#a new column (source) is available in ''sync task'' from the ''backstage button''. If the plugin's source mismatches the plugin server.host (the place from which is was last imported), the source value is displayed.
#a new button is also available : ''reset source''. Click on this button applies plugin's ''source'' as server.host for the checked lines.
Look at this [[example|SyncFromSourceDemo]] on plugin [[homepage|http://visualtw.ouvaton.org/VisualTW.html]].
!Patch required for TiddlyWiki 2.3.0
A bug in TW2.3.0 requires [[SyncPatch]].
!Code
***/
//{{{
config.macros.sync.getSyncableTiddlersWithoutSource = config.macros.sync.getSyncableTiddlersWithoutSource ? config.macros.sync.getSyncableTiddlersWithoutSource : config.macros.sync.getSyncableTiddlers;

config.macros.sync.startSyncWithoutSource = config.macros.sync.startSyncWithoutSource ? config.macros.sync.startSyncWithoutSource : config.macros.sync.startSync;

config.macros.sync.getSyncableTiddlers = function(){
	var syncs = config.macros.sync.getSyncableTiddlersWithoutSource();
	for(var cpt=0;cpt<syncs.length;cpt++){
		var s= getPluginInfo(syncs[cpt].tiddler).Source;
		if (s) {
			var source = FileAdaptor.minHostName(s);
			source = source.replace(/#[^#]*$/,"").replace(/\/*$/,"");
			syncs[cpt].source = (source==syncs[cpt].tiddler.fields["server.host"]) ? "": source;
		}
		else syncs[cpt].source = "";
	}
	return syncs;
}

config.macros.sync.startSync = function(place) {
	config.macros.sync.startSyncWithoutSource(place);
	var w = new Wizard(place.getElementsByTagName("form")[0]);
	w.setButtons([
			{caption: this.syncLabel, tooltip: this.syncPrompt, onClick: this.doSync},
			{caption: this.syncSourceLabel, tooltip: this.syncSourcePrompt, onClick: this.doSyncSource}
		]);
}

merge(config.macros.sync,{
	syncSourceLabel : "reset source",
	syncSourcePrompt : "reset synchronization to plugin source, if available"
})

config.macros.sync.doSyncSource = function(e)
{
	var rowNames = ListView.getSelectedRows(currSync.listView);
	for(var t=0; t<currSync.syncList.length; t++) {
		var si = currSync.syncList[t];
		if((rowNames.indexOf(si.title) != -1)&&si.source) {
			si.tiddler.fields["server.host"]=si.source;
			si.tiddler.fields["server.type"]="file";
			store.setDirty(true);
		}
	}
	backstage.switchTab(null);
	return false;
};

config.macros.sync.listViewTemplate.columns.push({name: 'Source', field: 'source', title: "Source", type: 'Link'});

//}}}
