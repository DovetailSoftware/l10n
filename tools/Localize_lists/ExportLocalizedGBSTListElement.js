function echo(s){
	stdout.WriteLine(s)
}

function show_usage_and_exit(err_msg){
	echo(err_msg + ", exiting.\n");
	echo("USAGE 1:\nCScript //E:JScript ExportLocalizedGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files] [/list:list_name]");
	echo("USAGE 2:\nCScript //E:JScript ExportLocalizedGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files] [/list:list_name_1,list_name_2,...]");
	echo('USAGE 3:\nCScript //E:JScript ExportLocalizedGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files] ["list_name_1" "list_name_2" ...]');
   WScript.Quit(-1);
}

function determineSeparator(aString) {
   var separatorIndex;
   var separators = [",","|",";",":","!","#","^",".","?","*","-","_"];
   for(separatorIndex in separators) {
      if(aString.indexOf(separators[separatorIndex]) < 0) return separators[separatorIndex];
   }
   return "\t";
};

function exportList(listTitle) {
   var boList = FCSession.CreateGeneric("gbst_lst");
   boList.DataFields = "title";
   if(listTitle != "*") {
      boList.AppendFilter("title","=",listTitle.replace(/[']/g,"''"));
   }
   boList.AppendSort("title","asc");

   var boElm = FCSession.CreateGeneric("gbst_elm");
   boElm.DataFields = "title";
   boElm.TraverseFromParent(boList,"gbst_lst2gbst_elm");
   boElm.AppendSort("title","asc");
   var boLocElm = FCSession.CreateGeneric("fc_loc_elm");
   boLocElm.DataFields = "title,objid";
   boLocElm.TraverseFromParent(boElm,"gbst_elm2fc_loc_elm");
   boLocElm.AppendFilter("locale","=",locale);
   boList.Query();

   var localized = "";

   while(!boList.EOF) {
      list_name = boList("title") + "";
      var file_name = file_path + list_name.replace(/[\/\\\?\:\*"\<\>\|\.,']/g,"-") + "_GBST_" + locale + constSDefaultExt;
      outFile = fso.CreateTextFile(file_name, constBOverwrite, constBUnicode);
      if (outFile == null) {
         echo("unable to create output file: " + file_name);
         WScript.Quit(-1);
      }
      echo("Exporting '" + list_name + "' list to '" + file_name + "'");
      while(!boElm.EOF) {
         try { localized = boLocElm("title") + ""; } catch(e) { localized = ""; }
         var line = list_name + boElm("title") + localized;
         var separator = determineSeparator(line);
         outFile.writeLine(list_name + separator + boElm("title") + separator + locale + separator + localized);
         boElm.MoveNext();
      }
      outFile.Close();
      outFile = null;
      boList.MoveNext();
   }

   FCSession.CloseAllGenerics();
   boElm = null;
   boLocElm = null;
   boList = null;
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

echo("\rExporting GBST lists' strings for locale: " + locale);

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

//CScript //E:JScript ExportLocalizedGBSTListElement.js /locale:pl-PL /list:"Case Type"
//CScript //E:JScript ExportLocalizedGBSTListElement.js /locale:pl-PL /list:"Problem Severity Level,Case Type,Open,Closed,Response Priority Code"
//CScript //E:JScript ExportLocalizedGBSTListElement.js /locale:pl-PL "Problem Severity Level" "Case Type" "Open" "Closed" "Response Priority Code"
