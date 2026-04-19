import sys
msg = sys.stdin.read()
msg = msg.replace("do junior", "")
msg = msg.replace("junior", "")
msg = msg.replace("Junior", "")
msg = msg.replace("carlos", "")
msg = msg.replace("Carlos", "")
print(msg.strip())
