function echo(s){
	stdout.WriteLine(s)
}

function show_usage_and_exit(err_msg){
	echo(err_msg + ", exiting.\n");
	echo("USAGE 1:\nCScript //E:JScript ExportLocalizedHGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files] [/list:list_name]");
	echo("USAGE 2:\nCScript //E:JScript ExportLocalizedHGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files] [/list:list_name_1,list_name_2,...]");
	echo('USAGE 3:\nCScript //E:JScript ExportLocalizedHGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files] ["list_name_1" "list_name_2" ...]');
   WScript.Quit(-1);
}

var hpath = {
   list_name:"",
   elems:[]
};
var bulkNum = 0;

function determineSeparator(aString) {
   var separatorIndex;
   var separators = [",","|",";",":","!","#","^",".","?","*","-","_"];
   for(separatorIndex in separators) {
      if(aString.indexOf(separators[separatorIndex]) < 0) return separators[separatorIndex];
   }
   return "\t";
};

function outputAllShowsAndElmsForAList(showObjid,elmObj) {
   var localized = "";
   var outbuff = hpath.list_name;
   for(var i=0; i < hpath.elems.length; i++) outbuff += "," + hpath.elems[i].title;

   var boHgbstParShow = FCSession.CreateGeneric("hgbst_show");
   boHgbstParShow.AppendFilter("objid", "=", showObjid);
   boHgbstParShow.BulkName = "hgbstelm_" + bulkNum++;
   var boHgbstElm = FCSession.CreateGeneric("hgbst_elm");
   boHgbstElm.TraverseFromParent(boHgbstParShow, "hgbst_show2hgbst_elm");
   boHgbstElm.DataFields = "title";
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
      var line = outbuff + boHgbstElm("title") + localized;
      var separator = determineSeparator(line);
      outFile.WriteLine(outbuff + separator + boHgbstElm("title") + separator + locale + separator + localized);
      hpath.elems.push({title:boHgbstElm("title")+""});
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

function exportList(listTitle) {
   var boHgbstLst = FCSession.CreateGeneric("hgbst_lst");
   boHgbstLst.BulkName = "hgbstlst_" + bulkNum++;
   boHgbstLst.DataFields = "title";
   if(listTitle != "*") {
      boHgbstLst.AppendFilter("title","=",listTitle.replace(/[']/g,"''"));
   }
   boHgbstLst.AppendSort("title","asc");

   var boHgbstShow = FCSession.CreateGeneric("hgbst_show");
   boHgbstShow.TraverseFromParent(boHgbstLst, "hgbst_lst2hgbst_show");
   boHgbstShow.BulkName = boHgbstLst.BulkName;
   boHgbstLst.Bulk.Query();

   if(boHgbstLst.EOF || boHgbstShow.EOF) {
      echo("List: '" + listTitle + "' does not exist in this database.");
   } else {
      while(!boHgbstLst.EOF) {
         var list_name = boHgbstLst("title") + "";
         var file_name = file_path + list_name.replace(/[\/\\\?\:\*"\<\>\|\.,']/g,"-") + "_HGBST_" + locale + constSDefaultExt;
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
   }

   FCSession.CloseAllGenerics();
   boHgbstShow = null;
   boHgbstLst = null;
}

var stdout = WScript.StdOut;
var constBOverwrite = true;
var constBUnicode = true;
var constSDefaultExt = ".txt";
var lists = [];

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

stdout.Write("Connecting to the database...");

var FCApp = WScript.CreateObject('FCFLCompat.FCApplication');
FCApp.Initialize();
var FCSession = FCApp.CreateSession();
FCSession.LoginFromFCApp();
FCSession.SetNullStringsToEmpty = true;
var fso = new ActiveXObject("Scripting.FileSystemObject");

echo("\rExporting HGBST lists' strings for locale: " + locale);

var list_count = WScript.Arguments.Unnamed.length;
var list_name = WScript.Arguments.Named.Item("list");
if(!list_name) {
   lists = [];
} else {
   lists = list_name.split(",");
}
if(lists.length == 0 && list_count == 0) {
   lists[0] = "*";
} else {
   for (var i=0; i <= list_count-1; i++) {
      lists.push(WScript.Arguments.Unnamed.Item(i));
   }
}

for(l in lists) exportList(lists[l]);

FCSession.Logout();

//CScript //E:JScript ExportLocalizedHGBSTListElement.js /locale:pl-PL
//CScript //E:JScript ExportLocalizedHGBSTListElement.js /locale:pl-PL /list:"CR_DESC"
//CScript //E:JScript ExportLocalizedHGBSTListElement.js /locale:pl-PL /list:"Notification Types,Subcase Types,Contact Expertise,Contact Status,Contact Type,Site Status,Site Type,User Status,Phone Types,Email Types,WORKGROUP"
//CScript //E:JScript ExportLocalizedHGBSTListElement.js /locale:pl-PL "Notification Types" "Subcase Types" "Contact Expertise" "Contact Status" "Contact Type" "Site Status" "Site Type" "User Status" "Phone Types" "Email Types" "WORKGROUP"
