function loadXmlFile( file) {
  var xhr=null;
  if (window.XMLHttpRequest) {
    xhr = new XMLHttpRequest();
  } else {  // IE 5+6
    xhr = new ActiveXObject("Microsoft.XMLHTTP");
  }
  xhr.open("GET", file, false);
  xhr.send();
  return xhr.responseXML;
}
