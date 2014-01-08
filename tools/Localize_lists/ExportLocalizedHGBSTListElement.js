function echo(s){
	stdout.WriteLine(s)
}

function show_usage_and_exit(err_msg){
	echo(err_msg + ", exiting.\n");
	echo("USAGE 1: CScript //E:JScript [options] ExportLocalizedHGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files] [/list:list_name]");
	echo("USAGE 2: CScript //E:JScript [options] ExportLocalizedHGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files] [/list:list_name_1,list_name_2,...]");
   WScript.Quit(-1);
}

var hpath = {
   list_name:"",
   elems:[]
};
var bulkNum = 0;

function outputAllShowsAndElmsForAList(showObjid,elmObj) {
   var localized = "";
   var outbuff = hpath.list_name;
   for(var i=0; i < hpath.elems.length; i++) outbuff += "," + hpath.elems[i].rank + "," + hpath.elems[i].title;

   var boHgbstParShow = FCSession.CreateGeneric("hgbst_show");
   boHgbstParShow.AppendFilter("objid", "=", showObjid);
   boHgbstParShow.BulkName = "hgbstelm_" + bulkNum++;
   var boHgbstElm = FCSession.CreateGeneric("hgbst_elm");
   boHgbstElm.TraverseFromParent(boHgbstParShow, "hgbst_show2hgbst_elm");
   boHgbstElm.DataFields = "title,rank";
   boHgbstElm.BulkName = boHgbstParShow.BulkName;
   boHgbstElm.AppendSort("title","asc");
   if(elmObj > 0) boHgbstElm.AppendFilter("objid", "<>", elmObj);
   var boLocElm = FCSession.CreateGeneric("fc_loc_elm");
   boLocElm.DataFields = "title";
   boLocElm.TraverseFromParent(boHgbstElm,"hgbst_elm2fc_loc_elm");
   boLocElm.AppendFilter("locale","=",locale);
   boLocElm.BulkName = boHgbstElm.BulkName;
   boHgbstElm.Bulk.Query();

   while(!boHgbstElm.EOF) {
      try { localized = boLocElm("title") + ""; } catch(e) { localized = ""; }
      outFile.WriteLine(outbuff + "," + boHgbstElm("rank") + "," + boHgbstElm("title") + "," + locale + "," + localized);
      hpath.elems.push({rank:boHgbstElm("rank")+0,title:boHgbstElm("title")+""});
      outputAllShowsAndElmsForAnElm(boHgbstElm.Id,showObjid);
      hpath.elems.pop();
      boHgbstElm.MoveNext();
   }

   boLocElm.CloseGeneric();
   boLocElm = null;
   boHgbstElm.CloseGeneric();
   boHgbstElm = null;
   boHgbstParShow.CloseGeneric();
   boHgbstParShow = null;
}

function outputAllShowsAndElmsForAnElm(elmObjid,showObjid) {
   var boHgbstParElm = FCSession.CreateGeneric("hgbst_elm");
   boHgbstParElm.AppendFilter("objid", "=", elmObjid);
   boHgbstParElm.BulkName = "hgbstshow_" + bulkNum++;
   var boHgbstChildShow = FCSession.CreateGeneric("hgbst_show");
   boHgbstChildShow.BulkName = boHgbstParElm.BulkName;
   boHgbstChildShow.TraverseFromParent(boHgbstParElm, "hgbst_elm2hgbst_show");
   boHgbstChildShow.AppendFilter("objid", "<>", showObjid);
   boHgbstChildShow.Query();
   if(boHgbstChildShow.Count() > 0) {
      outputAllShowsAndElmsForAList(boHgbstChildShow.Id,elmObjid);
   }
   boHgbstChildShow.CloseGeneric();
   boHgbstChildShow = null;
   boHgbstParElm.CloseGeneric();
   boHgbstParElm = null;
}

var stdout = WScript.StdOut;
var constBOverwrite = true;
var constBUnicode = true;
var constSDefaultExt = ".csv";

var locale = WScript.Arguments.Named.Item("locale");
if(!locale) locale = new String();
if(locale == "" || !((/[a-z]{2}-[A-Z]{2}/).test(locale))) {
   show_usage_and_exit("locale parameter in 'xx-XX' format was not provided and is required");
}

var file_path = WScript.Arguments.Named.Item("path");
if(!file_path) file_path = new String();
file_path = file_path.replace(/[\/\\]+$/,"");
if(file_path.length != 0) file_path += "\\";
var outFile = null;

var list_name = WScript.Arguments.Named.Item("list");
if(!list_name) list_name = new String();

stdout.Write("Connecting to the database...");

var FCApp = WScript.CreateObject('FCFLCompat.FCApplication');
FCApp.Initialize();
var FCSession = FCApp.CreateSession();	
FCSession.LoginFromFCApp();
FCSession.SetNullStringsToEmpty = true;
var fso = new ActiveXObject("Scripting.FileSystemObject");

echo("\rExporting " + ((list_name == "") ? "all HGBST lists'" : ("'"+list_name + "' HGBST list's")) + " strings for locale: " + locale);

var lists = list_name.split(",");
if(lists == "" || lists.length == 0) lists[0] = "*";

for(l in lists) {
   var boHgbstLst = FCSession.CreateGeneric("hgbst_lst");
   boHgbstLst.BulkName = "hgbstlst_" + bulkNum++;
   boHgbstLst.DataFields = "title";
   if(lists[l] != "*") {
      boHgbstLst.AppendFilter("title","=",lists[l]);
   }
   boHgbstLst.AppendSort("title","asc");

   var boHgbstShow = FCSession.CreateGeneric("hgbst_show");
   boHgbstShow.TraverseFromParent(boHgbstLst, "hgbst_lst2hgbst_show");
   boHgbstShow.BulkName = boHgbstLst.BulkName;
   boHgbstLst.Bulk.Query();

   while(!boHgbstLst.EOF) {
      list_name = boHgbstLst("title") + "";
      var file_name = file_path + list_name.replace(/[\/\\]/g,"-") + "_HGBST_" + locale + constSDefaultExt;
      outFile = fso.CreateTextFile(file_name, constBOverwrite, constBUnicode);
      if (outFile == null) {
         echo("unable to create output file: " + file_name);
         WScript.Quit(-1);
      }
      echo("Exporting '" + list_name + "' list to '" + file_name + "'");
      hpath.list_name = list_name;
      outputAllShowsAndElmsForAList(boHgbstShow.Id,0);
      outFile.Close();
      outFile = null;
      boHgbstLst.MoveNext();
   }

   FCSession.CloseAllGenerics();
   boHgbstShow = null;
   boHgbstLst = null;
}

FCSession.Logout();

//CScript //E:JScript ExportLocalizedHGBSTListElement.js /locale:pl-PL
//CScript //E:JScript ExportLocalizedHGBSTListElement.js /locale:pl-PL /list:"CR_DESC"
//CScript //E:JScript ExportLocalizedHGBSTListElement.js /locale:pl-PL /list:"Notification Types,Subcase Types,Contact Expertise,Contact Status,Contact Type,Site Status,Site Type,User Status,Phone Types,Email Types,WORKGROUP"
